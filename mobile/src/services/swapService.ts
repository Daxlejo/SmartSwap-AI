import type { User, Item, SwapRoute, Proposal } from '@/types';
import { apiClient, ApiError } from '@/services/http/apiClient';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { itemsService, type CreateItemPayload } from '@/services/items/items.service';
import { authService } from '@/services/auth/auth.service';
import { mockUsers, mockItems, mockSwapRoute, mockProposals } from '@/data/mockData';
import { findRoutes as findRoutesLogic } from '@/lib/routeFinder';

const simulateLatency = <T>(data: T, minMs = 200, maxMs = 400): Promise<T> => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
};

export const getCurrentUser = async (): Promise<User> => {
  if (tokenStorage.hasToken()) {
    try {
      return await authService.getMe();
    } catch {
      // Fallback to mock user if offline or backend unavailable
    }
  }
  const user = mockUsers.find((u) => u.id === 'user-alex') || mockUsers[0];
  return simulateLatency(user);
};

export const getItems = async (): Promise<Item[]> => {
  try {
    const items = await itemsService.listItems();
    if (items.length > 0) {
      return items;
    }
  } catch {
    // Fallback to mock items if backend is unavailable
  }
  return simulateLatency([...mockItems]);
};

export const getMyItems = async (): Promise<Item[]> => {
  if (tokenStorage.hasToken()) {
    try {
      return await itemsService.listMyItems();
    } catch {
      // Fallback to mock items if backend is unavailable
    }
  }
  const myItems = mockItems.filter((item) => item.ownerId === 'user-alex');
  return simulateLatency(myItems);
};

export const getItemById = async (id: string): Promise<Item | null> => {
  try {
    return await itemsService.getItemById(id);
  } catch {
    const item = mockItems.find((i) => i.id === id) || null;
    return simulateLatency(item);
  }
};

export const createItem = async (payload: CreateItemPayload): Promise<Item> => {
  return itemsService.createItem(payload);
};

export const deleteItem = async (id: string): Promise<void> => {
  return itemsService.deleteItem(id);
};

export const getUserById = async (id: string): Promise<User | null> => {
  const user = mockUsers.find((u) => u.id === id) || null;
  return simulateLatency(user);
};

export const getRecommendedRoutes = async (): Promise<SwapRoute[]> => {
  if (tokenStorage.hasToken()) {
    try {
      const routes = await apiClient.get<SwapRoute[]>('/routes/recommended');
      if (Array.isArray(routes) && routes.length > 0) {
        return routes;
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        throw err;
      }
      // Graceful fallback while routes endpoint is being migrated
    }
  }
  return simulateLatency([mockSwapRoute]);
};

export const getProposals = async (): Promise<Proposal[]> => {
  if (tokenStorage.hasToken()) {
    try {
      const proposals = await apiClient.get<Proposal[]>('/proposals');
      if (Array.isArray(proposals)) {
        return proposals;
      }
    } catch {
      // Graceful fallback while proposals endpoint is being migrated
    }
  }
  return simulateLatency([...mockProposals]);
};

export const findRoutes = async (haveItemId: string, wantItemId: string): Promise<SwapRoute[]> => {
  if (tokenStorage.hasToken()) {
    try {
      const routes = await apiClient.post<SwapRoute[]>('/routes/find', {
        haveItemId,
        wantItemId,
        maxSwaps: 5,
        maxRoutes: 10,
      });
      if (Array.isArray(routes) && routes.length > 0) {
        return routes;
      }
    } catch {
      // Graceful fallback to client-side graph BFS
    }
  }
  const routes = findRoutesLogic(mockItems, mockUsers, haveItemId, wantItemId);
  return simulateLatency(routes, 800, 1200);
};
