import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User, Item, SwapRoute, Proposal } from '@/types';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { setOnUnauthorizedHandler } from '@/services/http/apiClient';
import { authService, type RegisterPayload, type UpdateProfilePayload } from '@/services/auth/auth.service';
import { itemsService, type CreateItemPayload } from '@/services/items/items.service';
import {
  routesService,
  mapRouteToProposal,
  type SearchRoutesPayload,
  type ProposeRoutePayload,
  type RouteDecision,
} from '@/services/routes/routes.service';
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
  searchRoutesReal: (params: SearchRoutesPayload) => Promise<SwapRoute[]>;
  proposeRouteReal: (route: SwapRoute | ProposeRoutePayload) => Promise<SwapRoute>;
  respondToProposalReal: (
    routeId: string,
    decision: RouteDecision,
    comment?: string,
  ) => Promise<SwapRoute>;
  completeSwapReal: (routeId: string) => Promise<SwapRoute>;
  refreshRoutesReal: () => Promise<SwapRoute[]>;
}

const defaultUser: User = mockUsers.find((u) => u.id === 'user-alex') || mockUsers[0];
const defaultMyItems: Item[] = mockItems.filter((item) => item.ownerId === defaultUser.id);

const isSwapRouteObject = (val: SwapRoute | ProposeRoutePayload): val is SwapRoute => {
  return (
    val !== null &&
    typeof val === 'object' &&
    'chainItems' in val &&
    Array.isArray(val.chainItems) &&
    'participants' in val &&
    Array.isArray(val.participants)
  );
};

const toProposePayload = (routeOrPayload: SwapRoute | ProposeRoutePayload): ProposeRoutePayload => {
  if (!isSwapRouteObject(routeOrPayload)) {
    return routeOrPayload;
  }

  const route = routeOrPayload;
  const steps =
    route.steps && route.steps.length > 0
      ? route.steps.map((s, idx) => ({
          stepOrder: s.stepOrder ?? idx + 1,
          userId: s.userId,
          givesItemId: s.givesItemId,
          receivesItemId: s.receivesItemId,
        }))
      : route.chainItems.map((item, idx) => {
          const participant = route.participants[idx] || route.participants[0] || defaultUser;
          const prevItem =
            idx === 0
              ? route.chainItems[route.chainItems.length - 1]
              : route.chainItems[idx - 1];
          return {
            stepOrder: idx + 1,
            userId: participant.id || item.ownerId,
            givesItemId: item.id,
            receivesItemId: prevItem?.id || route.targetItemId,
          };
        });

  return {
    routeId: route.id,
    code: route.code,
    offeredItemId: route.offeredItemId || route.chainItems[0]?.id,
    targetItemId: route.targetItemId || route.chainItems[route.chainItems.length - 1]?.id,
    objectiveText:
      route.objectiveText ||
      route.chainItems[route.chainItems.length - 1]?.name ||
      route.title,
    matchScore: route.matchScore ?? 96,
    aiExplanation: route.aiExplanation,
    co2SavedKg: route.co2SavedKg,
    steps,
  };
};

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
  const [routes, setRoutes] = useState<SwapRoute[]>([mockSwapRoute]);
  const [proposals, setProposals] = useState<Proposal[]>(mockProposals);

  const refreshRoutesReal = useCallback(async (): Promise<SwapRoute[]> => {
    if (!tokenStorage.hasToken()) {
      return routes;
    }

    try {
      const activeRoutes = await routesService.listMyRoutes();
      if (activeRoutes.length > 0) {
        setRoutes(activeRoutes);
        const mappedProposals = activeRoutes.map((r) =>
          mapRouteToProposal(r, currentUser?.id || defaultUser.id),
        );
        setProposals((prev) => {
          const existingIds = new Set(mappedProposals.map((p) => p.id));
          return [...mappedProposals, ...prev.filter((p) => !existingIds.has(p.id))];
        });
      }
      return activeRoutes;
    } catch {
      return routes;
    }
  }, [currentUser?.id, routes]);

  const loadMarketplaceAndUserItems = useCallback(async (hasActiveToken: boolean) => {
    setIsItemsLoading(true);
    try {
      const [allItemsResult, myItemsResult, myRoutesResult] = await Promise.allSettled([
        itemsService.listItems(),
        hasActiveToken ? itemsService.listMyItems() : Promise.resolve<Item[]>([]),
        hasActiveToken ? routesService.listMyRoutes() : Promise.resolve<SwapRoute[]>([]),
      ]);

      if (allItemsResult.status === 'fulfilled') {
        setItems(allItemsResult.value);
      }

      if (hasActiveToken && myItemsResult.status === 'fulfilled') {
        setMyItems(myItemsResult.value);
      }

      if (
        hasActiveToken &&
        myRoutesResult.status === 'fulfilled' &&
        myRoutesResult.value.length > 0
      ) {
        setRoutes(myRoutesResult.value);
        const mappedProposals = myRoutesResult.value.map((r) =>
          mapRouteToProposal(r, defaultUser.id),
        );
        setProposals((prev) => {
          const existingIds = new Set(mappedProposals.map((p) => p.id));
          return [...mappedProposals, ...prev.filter((p) => !existingIds.has(p.id))];
        });
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

  const searchRoutesReal = useCallback(
    async (params: SearchRoutesPayload): Promise<SwapRoute[]> => {
      return routesService.searchRoutes(params);
    },
    [],
  );

  const proposeRouteReal = useCallback(
    async (routeOrPayload: SwapRoute | ProposeRoutePayload): Promise<SwapRoute> => {
      const payload = toProposePayload(routeOrPayload);
      let proposedRoute: SwapRoute;

      try {
        proposedRoute = await routesService.proposeRoute(payload);
      } catch {
        // Offline / unit test fallback
        const baseRoute = isSwapRouteObject(routeOrPayload) ? routeOrPayload : mockSwapRoute;
        proposedRoute = {
          ...baseRoute,
          id: baseRoute.id || `route-proposed-${Date.now()}`,
          code: baseRoute.code || 'SR-8492',
          status: 'ACTIVE',
          initiatorId: currentUser?.id || defaultUser.id,
          createdAt: new Date().toISOString(),
        };
      }

      setRoutes((prev) => [
        proposedRoute,
        ...prev.filter((r) => r.id !== proposedRoute.id),
      ]);

      const newProposal = mapRouteToProposal(proposedRoute, currentUser?.id || defaultUser.id);
      setProposals((prev) => [
        newProposal,
        ...prev.filter((p) => p.id !== newProposal.id),
      ]);

      return proposedRoute;
    },
    [currentUser?.id],
  );

  const respondToProposalReal = useCallback(
    async (
      routeId: string,
      decision: RouteDecision,
      comment?: string,
    ): Promise<SwapRoute> => {
      let updatedRoute: SwapRoute;

      try {
        updatedRoute = await routesService.respondToRoute(routeId, decision, comment);
      } catch {
        // Offline / mock fallback
        const existing = routes.find((r) => r.id === routeId || r.code === routeId) || mockSwapRoute;
        const stepAcceptance = decision === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
        const nextStatus = decision === 'ACCEPTED' ? 'CONFIRMED' : 'CANCELLED';

        updatedRoute = {
          ...existing,
          id: routeId,
          status: nextStatus,
          steps: existing.steps?.map((s) =>
            s.userId === (currentUser?.id || defaultUser.id)
              ? { ...s, acceptance: stepAcceptance, respondedAt: new Date().toISOString() }
              : s,
          ),
        };
      }

      setRoutes((prev) => {
        const exists = prev.some((r) => r.id === updatedRoute.id || r.id === routeId);
        if (!exists) {
          return [updatedRoute, ...prev];
        }
        return prev.map((r) =>
          r.id === updatedRoute.id || r.id === routeId ? updatedRoute : r,
        );
      });

      const mappedStatus = decision === 'ACCEPTED' ? 'accepted' : 'declined';
      setProposals((prev) =>
        prev.map((p) => (p.id === routeId || p.id === updatedRoute.id ? { ...p, status: mappedStatus } : p)),
      );

      return updatedRoute;
    },
    [currentUser?.id, routes],
  );

  const completeSwapReal = useCallback(
    async (routeId: string): Promise<SwapRoute> => {
      let completedRoute: SwapRoute;

      try {
        completedRoute = await routesService.completeRoute(routeId);
      } catch {
        const existing = routes.find((r) => r.id === routeId || r.code === routeId) || mockSwapRoute;
        completedRoute = {
          ...existing,
          id: routeId,
          status: 'COMPLETED',
          steps: existing.steps?.map((s) => ({
            ...s,
            acceptance: 'ACCEPTED',
            deliveryConfirmed: true,
          })),
        };
      }

      setRoutes((prev) => {
        const exists = prev.some((r) => r.id === completedRoute.id || r.id === routeId);
        if (!exists) {
          return [completedRoute, ...prev];
        }
        return prev.map((r) =>
          r.id === completedRoute.id || r.id === routeId ? completedRoute : r,
        );
      });

      setProposals((prev) =>
        prev.map((p) =>
          p.id === routeId || p.id === completedRoute.id ? { ...p, status: 'completed' } : p,
        ),
      );

      return completedRoute;
    },
    [routes],
  );

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
      searchRoutesReal,
      proposeRouteReal,
      respondToProposalReal,
      completeSwapReal,
      refreshRoutesReal,
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
      searchRoutesReal,
      proposeRouteReal,
      respondToProposalReal,
      completeSwapReal,
      refreshRoutesReal,
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
  searchRoutesReal: async (params) => routesService.searchRoutes(params),
  proposeRouteReal: async (routeOrPayload) =>
    routesService.proposeRoute(toProposePayload(routeOrPayload)),
  respondToProposalReal: async (routeId, decision, comment) =>
    routesService.respondToRoute(routeId, decision, comment),
  completeSwapReal: async (routeId) => routesService.completeRoute(routeId),
  refreshRoutesReal: async () => routesService.listMyRoutes(),
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  return context ?? fallbackContextValue;
};

export default AppContext;
