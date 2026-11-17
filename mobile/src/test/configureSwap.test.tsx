import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';
import type { Item, User } from '@/types';
import {
  buildCircularSearch,
  buildDirectPreviewRoute,
  findWantedCandidates,
  getNoRoutesReason,
  isOfferableItem,
  parseSwapDraft,
  reachableStep,
  swapDraftForItem,
  swapDraftPath,
} from '@/utils/swapSearch';

let myItems: Item[] = [];
let catalog: Item[] = [];
let isItemsLoading = false;
let itemsLoadState: 'ready' | 'loading' | 'error' = 'ready';

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    myItems,
    items: catalog,
    isItemsLoading,
    loadStates: { items: itemsLoadState, routes: 'ready', notifications: 'ready' },
    refreshItems: vi.fn(),
    searchRoutesReal: vi.fn(),
    currentUser: { id: 'user-1', name: 'Ana Pérez' },
    isAuthenticated: true,
    locationScope: 'country',
    setLocationScope: vi.fn(),
  }),
}));

const { ConfigureSwapScreen } = await import('@/screens/ConfigureSwapScreen');

const publishedItem: Item = {
  id: 'item-1',
  name: 'Bicicleta de ruta',
  category: 'Deportes',
  condition: 'Buen estado',
  ownerId: 'user-1',
  wants: ['Control PS5'],
  estimatedValue: 450000,
  status: 'ACTIVE',
};

const control: Item = {
  id: 'item-9',
  name: 'Control PS5 DualSense',
  category: 'Videojuegos',
  condition: 'Como nuevo',
  ownerId: 'user-2',
  wants: ['Guitarra'],
  estimatedValue: 350000,
  status: 'ACTIVE',
  owner: { id: 'user-2', name: 'Beto Díaz', rating: 5, location: 'Pasto' },
};

const viewer: User = {
  id: 'user-1',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  rating: 5,
  location: 'Pasto',
  verified: false,
  co2SavedKg: 0,
};

const render = (url: string): string =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <ConfigureSwapScreen />
    </MemoryRouter>,
  );

/** Opening tag of the sticky Continue button, found by its test id. */
const continueButtonTag = (html: string): string => {
  const marker = html.indexOf('data-testid="configure-continue-button"');
  expect(marker).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<button', marker);
  return html.slice(open, html.indexOf('>', marker) + 1);
};

/** The `disabled` attribute itself; the Tailwind `disabled:` classes are always present. */
const DISABLED_ATTRIBUTE = /\sdisabled=""/;

describe('isOfferableItem', () => {
  it('accepts published items and items without a status', () => {
    expect(isOfferableItem({ status: 'ACTIVE' })).toBe(true);
    expect(isOfferableItem({ status: 'AVAILABLE' })).toBe(true);
    expect(isOfferableItem({})).toBe(true);
  });

  it('rejects reserved, traded and paused items', () => {
    expect(isOfferableItem({ status: 'PENDING_SWAP' })).toBe(false);
    expect(isOfferableItem({ status: 'SWAPPED' })).toBe(false);
    expect(isOfferableItem({ status: 'PAUSED' })).toBe(false);
  });
});

describe('swap draft in the URL', () => {
  it('round-trips every choice', () => {
    const path = swapDraftPath({
      step: 3,
      offeredItemId: 'item-1',
      wantedItemId: 'item-9',
      wantFixed: true,
      mode: 'circular',
    });
    expect(path).toBe('/swap/configure?step=3&have=item-1&want=item-9&fixed=1&mode=circular');
    expect(parseSwapDraft(new URL(path, 'http://x').searchParams)).toEqual({
      step: 3,
      offeredItemId: 'item-1',
      wantedItemId: 'item-9',
      wantFixed: true,
      mode: 'circular',
    });
  });

  it('opens on step 1 with the item fixed when it comes from the detail', () => {
    const draft = parseSwapDraft(new URL(swapDraftForItem('item-9'), 'http://x').searchParams);
    expect(draft).toMatchObject({ step: 1, wantedItemId: 'item-9', wantFixed: true });
  });

  it('ignores unknown steps and modes', () => {
    expect(parseSwapDraft(new URLSearchParams('step=7&mode=x'))).toEqual({
      step: 1,
      offeredItemId: undefined,
      wantedItemId: undefined,
      wantFixed: false,
      mode: undefined,
    });
  });

  it('never shows a step whose earlier choices are missing', () => {
    expect(reachableStep({ step: 3, wantFixed: false })).toBe(1);
    expect(reachableStep({ step: 3, offeredItemId: 'a', wantFixed: false })).toBe(2);
    expect(reachableStep({ step: 3, offeredItemId: 'a', wantedItemId: 'b', wantFixed: false })).toBe(3);
  });
});

describe('buildCircularSearch', () => {
  it('asks for rings of 3 or 4 that end with the chosen item', () => {
    const search = buildCircularSearch(publishedItem, control);
    expect(search.path).toBe(
      '/swap/searching?have=item-1&want=item-9&q=Control+PS5+DualSense&minSteps=3&maxSteps=4&tolerance=25',
    );
    expect(search.state).toEqual({
      offeredItemId: 'item-1',
      wantItemId: 'item-9',
      objectiveText: 'Control PS5 DualSense',
      desiredCategory: 'Videojuegos',
      minSteps: 3,
      maxSteps: 4,
      valueTolerancePct: 25,
    });
  });
});

describe('findWantedCandidates', () => {
  it('matches without accents and leaves out the viewer own and reserved items', () => {
    const items = [
      control,
      { ...control, id: 'own', ownerId: 'user-1' },
      { ...control, id: 'locked', status: 'PENDING_SWAP' },
    ];
    expect(findWantedCandidates(items, 'dualsénse', 'user-1').map((item) => item.id)).toEqual([
      'item-9',
    ]);
    expect(findWantedCandidates(items, 'c', 'user-1')).toEqual([]);
  });
});

describe('buildDirectPreviewRoute', () => {
  it('previews a 2-person ring where the viewer already accepted', () => {
    const route = buildDirectPreviewRoute({ offeredItem: publishedItem, wantedItem: control }, viewer);
    expect(route?.stepsCount).toBe(2);
    expect(route?.steps?.map((step) => [step.userId, step.givesItemId, step.acceptance])).toEqual([
      ['user-1', 'item-1', 'ACCEPTED'],
      ['user-2', 'item-9', 'PENDING'],
    ]);
  });

  it('cannot preview without the owner', () => {
    expect(
      buildDirectPreviewRoute({ offeredItem: publishedItem, wantedItem: { ...control, owner: undefined } }, viewer),
    ).toBeNull();
  });
});

describe('getNoRoutesReason', () => {
  const loadedInventory = (publishedCount: number) => ({ loaded: true, publishedCount });

  it('blames the missing inventory when nothing is published', () => {
    expect(getNoRoutesReason(loadedInventory(0))).toBe('noItems');
  });

  it('reports that no cycle closes for the item otherwise', () => {
    expect(getNoRoutesReason(loadedInventory(3))).toBe('noCycles');
  });

  it('blames neither while the inventory has not loaded', () => {
    expect(getNoRoutesReason({ loaded: false, publishedCount: 0 })).toBe('unknown');
  });
});

describe('ConfigureSwapScreen steps', () => {
  beforeEach(() => {
    myItems = [];
    catalog = [control];
    isItemsLoading = false;
    itemsLoadState = 'ready';
    // Static rendering warns about router layout effects; that is expected outside a browser.
    const consoleError = console.error.bind(console);
    vi.spyOn(console, 'error').mockImplementation((message: unknown, ...rest: unknown[]) => {
      if (typeof message === 'string' && message.includes('useLayoutEffect')) return;
      consoleError(message, ...rest);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows only the empty state with "Publicar un artículo" when nothing is published', () => {
    myItems = [
      { ...publishedItem, id: 'item-2', status: 'SWAPPED' },
      { ...publishedItem, id: 'item-3', status: 'PENDING_SWAP' },
    ];
    const html = render('/swap/configure');

    expect(html).not.toContain('data-testid="configure-continue-button"');
    expect(html).toContain('Aún no tienes artículos publicados');
    expect(html).toContain('Publicar un artículo');
  });

  it('does not tell the user to publish while the inventory is still loading', () => {
    isItemsLoading = true;
    itemsLoadState = 'loading';
    const html = render('/swap/configure');

    expect(html).not.toContain('data-testid="configure-continue-button"');
    expect(html).not.toContain('Publicar un artículo');
  });

  it('step 1 comes with the only published item chosen', () => {
    myItems = [publishedItem];
    const html = render('/swap/configure');

    expect(html).toContain('Paso 1 de 3');
    expect(html).toContain('Lo que ofreces');
    expect(html).toMatch(/data-testid="offer-option-item-1"[^>]*>\s*<input[^>]*checked=""/);
    expect(continueButtonTag(html)).not.toMatch(DISABLED_ATTRIBUTE);
  });

  it('step 1 waits for a choice when there are several items', () => {
    myItems = [publishedItem, { ...publishedItem, id: 'item-4', name: 'Patineta' }];
    const html = render('/swap/configure');

    expect(continueButtonTag(html)).toMatch(DISABLED_ATTRIBUTE);
  });

  it('step 2 from an item detail shows that item, fixed', () => {
    myItems = [publishedItem];
    const html = render('/swap/configure?step=2&have=item-1&want=item-9&fixed=1');

    expect(html).toContain('Lo que recibes');
    expect(html).toContain('Control PS5 DualSense');
    expect(html).not.toContain('data-testid="configure-want-search"');
    expect(continueButtonTag(html)).not.toMatch(DISABLED_ATTRIBUTE);
  });

  it('step 2 from Home searches the catalog and offers the saved wishes', () => {
    myItems = [publishedItem];
    const html = render('/swap/configure?step=2&have=item-1');

    expect(html).toContain('data-testid="configure-want-search"');
    expect(html).toContain('Control PS5');
    expect(continueButtonTag(html)).toMatch(DISABLED_ATTRIBUTE);
  });

  it('step 3 offers Direct and Circular without the old marketing labels', () => {
    myItems = [publishedItem];
    const html = render('/swap/configure?step=3&have=item-1&want=item-9');

    expect(html).toContain('Tipo de canje');
    expect(html).toContain('data-testid="swap-mode-direct"');
    expect(html).toContain('data-testid="swap-mode-circular"');
    expect(html).toContain('Beto Díaz');
    expect(html).toContain('Revisar propuesta');
    expect(html.toUpperCase()).not.toContain('RED INTELIGENTE');
    expect(html.toUpperCase()).not.toContain('INTERCAMBIO INTELIGENTE');
  });

  it('step 3 in circular mode searches rings', () => {
    myItems = [publishedItem];
    const html = render('/swap/configure?step=3&have=item-1&want=item-9&mode=circular');

    expect(html).toContain('Buscar anillos');
  });
});
