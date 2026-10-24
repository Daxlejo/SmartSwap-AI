import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User, Item, SwapRoute, Proposal } from '@/types';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { setOnUnauthorizedHandler } from '@/services/http/apiClient';
import { authService, type RegisterPayload, type UpdateProfilePayload } from '@/services/auth/auth.service';
import { itemsService, type CreateItemPayload } from '@/services/items/items.service';
import { mockUsers, mockItems, mockSwapRoute, mockProposals } from '@/data/mockData';

export interface AppContextValue {
  currentUser: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isItemsLoading: boolean;
  items: Item[];
  myItems: Item[];
  users: User[];
  routes: SwapRoute[];
  proposals: Proposal[];
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshItems: () => Promise<void>;
  createItemReal: (payload: CreateItemPayload) => Promise<Item>;
  deleteItemReal: (id: string) => Promise<void>;
  updateProfileReal: (payload: UpdateProfilePayload) => Promise<User>;
}

const defaultUser: User = mockUsers.find((u) => u.id === 'user-alex') || mockUsers[0];
const defaultMyItems: Item[] = mockItems.filter((item) => item.ownerId === defaultUser.id);

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    tokenStorage.hasToken() ? null : defaultUser,
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => tokenStorage.hasToken());
  const [isHydrating, setIsHydrating] = useState<boolean>(() => tokenStorage.hasToken());
  const [isItemsLoading, setIsItemsLoading] = useState<boolean>(false);

  const [items, setItems] = useState<Item[]>(mockItems);
  const [myItems, setMyItems] = useState<Item[]>(defaultMyItems);
  const [users] = useState<User[]>(mockUsers);
  const [routes] = useState<SwapRoute[]>([mockSwapRoute]);
  const [proposals] = useState<Proposal[]>(mockProposals);

  const loadMarketplaceAndUserItems = useCallback(async (hasActiveToken: boolean) => {
    setIsItemsLoading(true);
    try {
      const [allItemsResult, myItemsResult] = await Promise.allSettled([
        itemsService.listItems(),
        hasActiveToken ? itemsService.listMyItems() : Promise.resolve<Item[]>([]),
      ]);

      if (allItemsResult.status === 'fulfilled') {
        setItems(allItemsResult.value);
      }

      if (hasActiveToken && myItemsResult.status === 'fulfilled') {
        setMyItems(myItemsResult.value);
      }
    } finally {
      setIsItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setMyItems([]);
    });

    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const hasSavedToken = tokenStorage.hasToken();

      if (!hasSavedToken) {
        setIsHydrating(false);
        return;
      }

      setIsHydrating(true);
      try {
        const user = await authService.getMe();
        if (!isMounted) return;
        setCurrentUser(user);
        setIsAuthenticated(true);
        await loadMarketplaceAndUserItems(true);
      } catch {
        if (!isMounted) return;
        tokenStorage.clearToken();
        setIsAuthenticated(false);
        setCurrentUser(defaultUser);
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [loadMarketplaceAndUserItems]);

  const refreshItems = useCallback(async () => {
    const hasActiveToken = tokenStorage.hasToken();
    await loadMarketplaceAndUserItems(hasActiveToken);
  }, [loadMarketplaceAndUserItems]);

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<User> => {
      const session = await authService.login(email, password);
      setCurrentUser(session.user);
      setIsAuthenticated(true);
      await loadMarketplaceAndUserItems(true);
      return session.user;
    },
    [loadMarketplaceAndUserItems],
  );

  const registerWithEmail = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      const session = await authService.register(payload);
      setCurrentUser(session.user);
      setIsAuthenticated(true);
      await loadMarketplaceAndUserItems(true);
      return session.user;
    },
    [loadMarketplaceAndUserItems],
  );

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setMyItems([]);
  }, []);

  const createItemReal = useCallback(async (payload: CreateItemPayload): Promise<Item> => {
    const created = await itemsService.createItem(payload);
    setMyItems((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
    setItems((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
    return created;
  }, []);

  const deleteItemReal = useCallback(async (id: string): Promise<void> => {
    await itemsService.deleteItem(id);
    setMyItems((prev) => prev.filter((item) => item.id !== id));
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateProfileReal = useCallback(async (payload: UpdateProfilePayload): Promise<User> => {
    const updatedUser = await authService.updateProfile(payload);
    setCurrentUser(updatedUser);
    return updatedUser;
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser,
      isAuthenticated,
      isHydrating,
      isItemsLoading,
      items,
      myItems,
      users,
      routes,
      proposals,
      loginWithEmail,
      registerWithEmail,
      logout,
      refreshItems,
      createItemReal,
      deleteItemReal,
      updateProfileReal,
    }),
    [
      currentUser,
      isAuthenticated,
      isHydrating,
      isItemsLoading,
      items,
      myItems,
      users,
      routes,
      proposals,
      loginWithEmail,
      registerWithEmail,
      logout,
      refreshItems,
      createItemReal,
      deleteItemReal,
      updateProfileReal,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const fallbackContextValue: AppContextValue = {
  currentUser: defaultUser,
  isAuthenticated: false,
  isHydrating: false,
  isItemsLoading: false,
  items: mockItems,
  myItems: defaultMyItems,
  users: mockUsers,
  routes: [mockSwapRoute],
  proposals: mockProposals,
  loginWithEmail: async (email, password) => {
    const session = await authService.login(email, password);
    return session.user;
  },
  registerWithEmail: async (payload) => {
    const session = await authService.register(payload);
    return session.user;
  },
  logout: () => {
    authService.logout();
  },
  refreshItems: async () => {},
  createItemReal: async (payload) => itemsService.createItem(payload),
  deleteItemReal: async (id) => itemsService.deleteItem(id),
  updateProfileReal: async (payload) => authService.updateProfile(payload),
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  return context ?? fallbackContextValue;
};

export default AppContext;
