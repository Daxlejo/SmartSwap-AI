import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';
import type { Item } from '@/types';
import {
  buildSwapSearchNavigation,
  getNoRoutesReason,
  getSwapSearchBlocker,
  isOfferableItem,
} from '@/utils/swapSearch';

let myItems: Item[] = [];
let isItemsLoading = false;
let itemsLoadState: 'ready' | 'loading' | 'error' = 'ready';

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    myItems,
    items: [],
    isItemsLoading,
    loadStates: { items: itemsLoadState, routes: 'ready', notifications: 'ready' },
    refreshItems: vi.fn(),
    searchRoutesReal: vi.fn(),
    currentUser: null,
    isAuthenticated: false,
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
  wants: [],
  estimatedValue: 450000,
  status: 'ACTIVE',
};

const loadedInventory = (publishedCount: number) => ({ loaded: true, publishedCount });

const render = (wantItemName?: string): string =>
  renderToStaticMarkup(
    <MemoryRouter
      initialEntries={[
        { pathname: '/swap/configure', state: wantItemName ? { wantItemName } : null },
      ]}
    >
      <ConfigureSwapScreen />
    </MemoryRouter>,
  );

/** Opening tag of the fixed bottom Search CTA, found by its test id. */
const searchButtonTag = (html: string): string => {
  const marker = html.indexOf('data-testid="configure-search-button"');
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

describe('getSwapSearchBlocker', () => {
  it('blocks when the user has no published items', () => {
    expect(getSwapSearchBlocker(loadedInventory(0), 'Cámara')).toBe('noItems');
  });

  it('does not blame the inventory while it loads or after it failed', () => {
    expect(getSwapSearchBlocker({ loaded: false, publishedCount: 0 }, 'Cámara')).toBe(
      'inventoryPending',
    );
  });

  it('blocks when no objective was chosen', () => {
    expect(getSwapSearchBlocker(loadedInventory(2), '')).toBe('noWant');
    expect(getSwapSearchBlocker(loadedInventory(2), '  a ')).toBe('noWant');
  });

  it('lets the search through with an item and an objective', () => {
    expect(getSwapSearchBlocker(loadedInventory(1), 'Cámara')).toBeNull();
  });
});

describe('buildSwapSearchNavigation', () => {
  const base = { offeredItemId: 'item-1', objectiveText: ' Cámara ', mode: 'circular' as const };

  it('returns nothing while blocked, so a tap never reaches the engine or the AI', () => {
    expect(buildSwapSearchNavigation({ ...base, blocker: 'noItems' })).toBeNull();
    expect(buildSwapSearchNavigation({ ...base, blocker: 'noWant' })).toBeNull();
    expect(buildSwapSearchNavigation({ ...base, blocker: 'inventoryPending' })).toBeNull();
    expect(
      buildSwapSearchNavigation({ ...base, blocker: null, offeredItemId: undefined }),
    ).toBeNull();
  });

  it('builds the Searching route for an unblocked circular search', () => {
    const navigation = buildSwapSearchNavigation({
      ...base,
      blocker: null,
      target: { id: 'item-9', category: 'Fotografía' },
    });

    expect(navigation?.path).toBe(
      '/swap/searching?have=item-1&q=C%C3%A1mara&maxSteps=4&tolerance=25&want=item-9',
    );
    expect(navigation?.state).toEqual({
      offeredItemId: 'item-1',
      wantItemId: 'item-9',
      objectiveText: 'Cámara',
      desiredCategory: 'Fotografía',
      maxSteps: 4,
      valueTolerancePct: 25,
    });
  });

  it('limits a direct swap to two steps and omits an unmatched want', () => {
    const navigation = buildSwapSearchNavigation({ ...base, blocker: null, mode: 'direct' });

    expect(navigation?.state.maxSteps).toBe(2);
    expect(navigation?.path).not.toContain('want=');
  });
});

describe('getNoRoutesReason', () => {
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

describe('ConfigureSwapScreen search gate', () => {
  beforeEach(() => {
    myItems = [];
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

  it('disables Search and offers "Publicar un artículo" when nothing is published', () => {
    const html = render('Cámara');

    expect(searchButtonTag(html)).toMatch(DISABLED_ATTRIBUTE);
    expect(html).toContain('Aún no tienes artículos publicados');
    expect(html).toContain('Publicar un artículo');
    expect(html).toContain('Publica un artículo para poder buscar rutas.');
  });

  it('treats items that were already traded or reserved as not published', () => {
    myItems = [
      { ...publishedItem, id: 'item-2', status: 'SWAPPED' },
      { ...publishedItem, id: 'item-3', status: 'PENDING_SWAP' },
    ];
    const html = render('Cámara');

    expect(searchButtonTag(html)).toMatch(DISABLED_ATTRIBUTE);
    expect(html).toContain('Publicar un artículo');
  });

  it('disables Search and asks for an objective when none was chosen', () => {
    myItems = [publishedItem];
    const html = render();

    expect(searchButtonTag(html)).toMatch(DISABLED_ATTRIBUTE);
    expect(html).toContain('Escribe o elige qué quieres recibir para buscar rutas.');
    expect(html).not.toContain('Publicar un artículo');
  });

  it('does not tell the user to publish while the inventory is still loading', () => {
    isItemsLoading = true;
    itemsLoadState = 'loading';
    const html = render('Cámara');

    expect(searchButtonTag(html)).toMatch(DISABLED_ATTRIBUTE);
    expect(html).not.toContain('Publica un artículo para poder buscar rutas.');
  });

  it('enables Search with a published item and an objective', () => {
    myItems = [publishedItem];
    const html = render('Cámara');

    expect(searchButtonTag(html)).not.toMatch(DISABLED_ATTRIBUTE);
  });
});
