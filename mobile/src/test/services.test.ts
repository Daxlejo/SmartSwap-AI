import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { apiClient, ApiError, setOnUnauthorizedHandler } from '@/services/http/apiClient';
import { authService, normalizeUser } from '@/services/auth/auth.service';
import { itemsService, normalizeItem, toBackendCondition, toDisplayCondition } from '@/services/items/items.service';
import { calculateTargetDimensions } from '@/utils/imageCompressor';

// Mock localStorage for node test environment if not present
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('TokenStorage & ApiClient Architecture', () => {
  beforeEach(() => {
    const storageMock = createLocalStorageMock();
    vi.stubGlobal('window', {
      localStorage: storageMock,
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal('localStorage', storageMock);
    tokenStorage.clearToken();
    setOnUnauthorizedHandler(null);
  });

  it('persists and clears JWT under smartswap_jwt_token', () => {
    expect(tokenStorage.hasToken()).toBe(false);
    expect(tokenStorage.getToken()).toBeNull();

    tokenStorage.setToken('jwt-test-token-123');
    expect(tokenStorage.hasToken()).toBe(true);
    expect(tokenStorage.getToken()).toBe('jwt-test-token-123');
    expect(window.localStorage.getItem('smartswap_jwt_token')).toBe('jwt-test-token-123');

    tokenStorage.clearToken();
    expect(tokenStorage.hasToken()).toBe(false);
    expect(tokenStorage.getToken()).toBeNull();
  });

  it('injects Authorization Bearer token and parses JSON responses', async () => {
    tokenStorage.setToken('secret-jwt-abc');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'u-1', name: 'Alex', email: 'alex@smartswap.io' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = await authService.getMe();
    expect(user.id).toBe('u-1');
    expect(user.name).toBe('Alex');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    const headers = requestInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer secret-jwt-abc');
  });

  it('parses NestJS ErrorEnvelope into typed ApiError and clears token on 401', async () => {
    tokenStorage.setToken('expired-jwt');
    const unauthorizedSpy = vi.fn();
    setOnUnauthorizedHandler(unauthorizedSpy);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 401,
        error: 'Unauthorized',
        message: ['Invalid or expired token'],
        timestamp: '2026-10-24T12:00:00.000Z',
        path: '/api/v1/auth/me',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/auth/me')).rejects.toThrow(ApiError);

    expect(tokenStorage.getToken()).toBeNull();
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Domain Services & Utilities', () => {
  it('normalizes user profiles with safe defaults', () => {
    const user = normalizeUser({
      id: 'user-99',
      name: 'Sofía Vargas',
      email: 'sofia@smartswap.io',
      rating: 4.95,
      co2SavedKg: 21.4,
    });

    expect(user.id).toBe('user-99');
    expect(user.initials).toBe('SV');
    expect(user.verified).toBe(true);
    expect(user.co2SavedKg).toBe(21.4);
  });

  it('maps item conditions bi-directionally between UI and the API contract', () => {
    expect(toBackendCondition('Como nuevo')).toBe('LIKE_NEW');
    expect(toBackendCondition('Excelente estado')).toBe('EXCELLENT');
    expect(toBackendCondition('Buen estado')).toBe('GOOD');
    expect(toBackendCondition('Para repuesto')).toBe('FOR_PARTS');
    expect(toBackendCondition('EXCELLENT')).toBe('EXCELLENT');

    expect(toDisplayCondition('LIKE_NEW')).toBe('Como nuevo');
    expect(toDisplayCondition('EXCELLENT')).toBe('Excelente estado');
    expect(toDisplayCondition('GOOD')).toBe('Buen estado');
    expect(toDisplayCondition('FOR_PARTS')).toBe('Para repuesto');
  });

  it('normalizes items from both array and paginated envelope responses', async () => {
    const rawItem = {
      id: 'item-101',
      name: 'Cámara Fujifilm',
      category: 'Fotografía',
      condition: 'LIKE_NEW',
      ownerId: 'user-1',
      images: ['data:image/jpeg;base64,abc'],
      wants: [{ queryText: 'MacBook' }, 'iPad'],
      estimatedValue: 750,
    };

    const normalized = normalizeItem(rawItem);
    expect(normalized.condition).toBe('Como nuevo');
    expect(normalized.imageUrl).toBe('data:image/jpeg;base64,abc');
    expect(normalized.wants).toEqual(['MacBook', 'iPad']);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: [rawItem], total: 1, limit: 20, offset: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const list = await itemsService.listItems({ category: 'Fotografía' });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('item-101');
  });

  it('calculates proportional target dimensions capped at max 1024px', () => {
    expect(calculateTargetDimensions(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(calculateTargetDimensions(1500, 3000, 1024)).toEqual({ width: 512, height: 1024 });
    expect(calculateTargetDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});
