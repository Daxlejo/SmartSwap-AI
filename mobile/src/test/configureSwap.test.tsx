import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';
import type { Item } from '@/types';
import { getSwapSearchBlocker } from '@/utils/swapSearch';
import { aiService } from '@/services/ai/ai.service';
import { routesService } from '@/services/routes/routes.service';

const searchRoutesReal = vi.fn();
let myItems: Item[] = [];

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    myItems,
    items: [],
    isItemsLoading: false,
    loadStates: { items: 'ready', routes: 'ready', notifications: 'ready' },
    refreshItems: vi.fn(),
    searchRoutesReal,
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
};

const render = (): string =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ConfigureSwapScreen />
    </MemoryRouter>,
  );

/** The fixed bottom CTA: the only <button> carrying the "search routes" label. */
const searchButtonTag = (html: string): string => {
  const label = html.indexOf('Buscar Rutas Inteligentes');
  const open = html.lastIndexOf('<button', label);
  return html.slice(open, html.indexOf('>', open) + 1);
};

describe('getSwapSearchBlocker', () => {
  it('blocks when the user has no published items', () => {
    expect(getSwapSearchBlocker(0, 'Cámara')).toBe('noItems');
  });

  it('blocks when no objective was chosen', () => {
    expect(getSwapSearchBlocker(2, '')).toBe('noWant');
    expect(getSwapSearchBlocker(2, '  a ')).toBe('noWant');
  });

  it('lets the search through with an item and an objective', () => {
    expect(getSwapSearchBlocker(1, 'Cámara')).toBeNull();
  });
});

describe('ConfigureSwapScreen search gate', () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    searchRoutesReal.mockReset();
    fetchSpy.mockReset();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(routesService, 'searchRoutes');
    vi.spyOn(aiService, 'analyzeItemPhoto');
    vi.spyOn(aiService, 'estimateItemValue');
    // Static rendering warns about router layout effects; that is expected outside a browser.
    const consoleError = console.error.bind(console);
    vi.spyOn(console, 'error').mockImplementation((message: unknown, ...rest: unknown[]) => {
      if (typeof message === 'string' && message.includes('useLayoutEffect')) return;
      consoleError(message, ...rest);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const expectNoEngineOrAiCall = () => {
    expect(searchRoutesReal).not.toHaveBeenCalled();
    expect(routesService.searchRoutes).not.toHaveBeenCalled();
    expect(aiService.analyzeItemPhoto).not.toHaveBeenCalled();
    expect(aiService.estimateItemValue).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  };

  it('disables Search and offers "Publicar un artículo" when nothing is published', () => {
    myItems = [];
    const html = render();

    expect(searchButtonTag(html)).toContain('disabled');
    expect(html).toContain('Aún no tienes artículos publicados');
    expect(html).toContain('Publicar un artículo');
    expectNoEngineOrAiCall();
  });

  it('disables Search and asks for an objective when none was chosen', () => {
    myItems = [publishedItem];
    const html = render();

    expect(searchButtonTag(html)).toContain('disabled');
    expect(html).toContain('Escribe o elige qué quieres recibir para buscar rutas.');
    expect(html).not.toContain('Publicar un artículo');
    expectNoEngineOrAiCall();
  });
});
