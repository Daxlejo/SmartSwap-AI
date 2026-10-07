import type { User, Item, SwapRoute, Proposal } from '@/types';
import { mockUsers, mockItems, mockSwapRoute, mockProposals } from '@/data/mockData';

const simulateLatency = <T>(data: T, minMs = 300, maxMs = 500): Promise<T> => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
};

export const getCurrentUser = async (): Promise<User> => {
  const user = mockUsers.find((u) => u.id === 'user-alex') || mockUsers[0];
  return simulateLatency(user);
};

export const getItems = async (): Promise<Item[]> => {
  return simulateLatency([...mockItems]);
};

export const getMyItems = async (): Promise<Item[]> => {
  const myItems = mockItems.filter((item) => item.ownerId === 'user-alex');
  return simulateLatency(myItems);
};

export const getItemById = async (id: string): Promise<Item | null> => {
  const item = mockItems.find((i) => i.id === id) || null;
  return simulateLatency(item);
};

export const getUserById = async (id: string): Promise<User | null> => {
  const user = mockUsers.find((u) => u.id === id) || null;
  return simulateLatency(user);
};

export const getRecommendedRoutes = async (): Promise<SwapRoute[]> => {
  return simulateLatency([mockSwapRoute]);
};

export const getProposals = async (): Promise<Proposal[]> => {
  return simulateLatency([...mockProposals]);
};

import { findRoutes as findRoutesLogic } from '@/lib/routeFinder';

export const findRoutes = async (haveItemId: string, wantItemId: string): Promise<SwapRoute[]> => {
  const routes = findRoutesLogic(mockItems, mockUsers, haveItemId, wantItemId);
  return simulateLatency(routes, 1500, 2500); // 1.5 - 2.5s delay
};
