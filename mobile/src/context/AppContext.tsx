import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User, Item, SwapRoute, Proposal } from '@/types';
import { tokenStorage } from '@/services/storage/tokenStorage';
import {
  preferencesStorage,
  type LocationScopePreference,
} from '@/services/storage/preferencesStorage';
import { ApiError, setOnUnauthorizedHandler } from '@/services/http/apiClient';
import { authService, type RegisterPayload, type UpdateProfilePayload } from '@/services/auth/auth.service';
import { itemsService, type CreateItemPayload } from '@/services/items/items.service';
import {
  routesService,
  mapRouteToProposal,
  type SearchRoutesPayload,
  type ProposeRoutePayload,
  type RouteDecision,
} from '@/services/routes/routes.service';
import {
  notificationsService,
  type AppNotification,
} from '@/services/notifications/notifications.service';

/** Loading state of one server-backed collection; `error` means the last load failed. */
export type LoadStatus = 'loading' | 'ready' | 'error';

export interface LoadStates {
  items: LoadStatus;
  routes: LoadStatus;
  notifications: LoadStatus;
}

export interface AppContextValue {
  currentUser: User | null;
  loadStates: LoadStates;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isItemsLoading: boolean;
  items: Item[];
  myItems: Item[];
  routes: SwapRoute[];
  proposals: Proposal[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshItems: () => Promise<void>;
  createItemReal: (payload: CreateItemPayload) => Promise<Item>;
  deleteItemReal: (id: string) => Promise<void>;
  updateProfileReal: (payload: UpdateProfilePayload) => Promise<User>;
  uploadAvatarReal: (imageDataUrl: string) => Promise<User>;
  searchRoutesReal: (params: SearchRoutesPayload) => Promise<SwapRoute[]>;
  proposeRouteReal: (route: SwapRoute | ProposeRoutePayload) => Promise<SwapRoute>;
  respondToProposalReal: (
    routeId: string,
    decision: RouteDecision,
    comment?: string,
  ) => Promise<SwapRoute>;
  completeSwapReal: (routeId: string) => Promise<SwapRoute>;
  cancelRouteReal: (routeId: string) => Promise<SwapRoute>;
  refreshRoutesReal: () => Promise<SwapRoute[]>;
  markNotificationReadReal: (id: string) => Promise<void>;
  markAllNotificationsReadReal: () => Promise<void>;
  refreshNotificationsReal: () => Promise<AppNotification[]>;
  /** How far from the user's municipality the catalog and route searches reach. */
  locationScope: LocationScopePreference;
  setLocationScope: (scope: LocationScopePreference) => void;
}

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
          const participant = route.participants[idx] || route.participants[0];
          const prevItem =
            idx === 0
              ? route.chainItems[route.chainItems.length - 1]
              : route.chainItems[idx - 1];
          return {
            stepOrder: idx + 1,
            userId: participant?.id || item.ownerId,
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
    matchScore: route.matchScore,
    aiExplanation: route.aiExplanation,
    co2SavedKg: route.co2SavedKg,
    steps,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hadToken = tokenStorage.hasToken();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hadToken);
  const [isHydrating, setIsHydrating] = useState<boolean>(hadToken);
  const [isItemsLoading, setIsItemsLoading] = useState<boolean>(false);
  const [loadStates, setLoadStates] = useState<LoadStates>({
    items: hadToken ? 'loading' : 'ready',
    routes: hadToken ? 'loading' : 'ready',
    notifications: hadToken ? 'loading' : 'ready',
  });

  const [items, setItems] = useState<Item[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [routes, setRoutes] = useState<SwapRoute[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [locationScope, setLocationScopeState] = useState<LocationScopePreference>(() =>
    preferencesStorage.getLocationScope(),
  );

  const setLoadState = useCallback((key: keyof LoadStates, status: LoadStatus) => {
    setLoadStates((prev) => (prev[key] === status ? prev : { ...prev, [key]: status }));
  }, []);

  // Bumped on every login/logout so a slow response from a previous session is discarded
  const sessionEpochRef = useRef(0);

  // Latest viewer location for callbacks that must stay stable (kept in sync after every render)
  const viewerRef = useRef<{ scope: LocationScopePreference; municipalityCode?: string }>({
    scope: locationScope,
  });
  useEffect(() => {
    viewerRef.current = {
      scope: locationScope,
      municipalityCode: isAuthenticated ? currentUser?.municipalityCode : undefined,
    };
  }, [locationScope, currentUser?.municipalityCode, isAuthenticated]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  // Proposals are a view of the user's routes, never a separate store
  const proposals = useMemo<Proposal[]>(
    () => (currentUser ? routes.map((r) => mapRouteToProposal(r, currentUser.id)) : []),
    [routes, currentUser],
  );

  const refreshRoutesReal = useCallback(async (): Promise<SwapRoute[]> => {
    if (!tokenStorage.hasToken()) {
      setRoutes([]);
      setLoadState('routes', 'ready');
      return [];
    }
    const epoch = sessionEpochRef.current;
    setLoadState('routes', 'loading');
    try {
      const list = await routesService.listMyRoutes();
      if (epoch !== sessionEpochRef.current) return [];
      setRoutes(list);
      setLoadState('routes', 'ready');
      return list;
    } catch (error) {
      if (epoch !== sessionEpochRef.current) return [];
      console.error('Could not load routes', error);
      setLoadState('routes', 'error');
      return [];
    }
  }, [setLoadState]);

  const refreshNotificationsReal = useCallback(async (): Promise<AppNotification[]> => {
    if (!tokenStorage.hasToken()) {
      setNotifications([]);
      setLoadState('notifications', 'ready');
      return [];
    }
    const epoch = sessionEpochRef.current;
    setLoadState('notifications', 'loading');
    try {
      const list = await notificationsService.listNotifications();
      if (epoch !== sessionEpochRef.current) return [];
      setNotifications(list);
      setLoadState('notifications', 'ready');
      return list;
    } catch (error) {
      if (epoch !== sessionEpochRef.current) return [];
      console.error('Could not load notifications', error);
      setLoadState('notifications', 'error');
      return [];
    }
  }, [setLoadState]);

  const markNotificationReadReal = useCallback(
    async (id: string): Promise<void> => {
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, unread: false } : notif)),
      );
      try {
        await notificationsService.markAsRead(id);
      } catch (error) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, unread: true } : notif)),
        );
        throw error;
      }
    },
    [],
  );

  const markAllNotificationsReadReal = useCallback(async (): Promise<void> => {
    const previouslyUnread = new Set(notifications.filter((n) => n.unread).map((n) => n.id));
    setNotifications((prev) => prev.map((notif) => ({ ...notif, unread: false })));
    try {
      await notificationsService.markAllAsRead();
    } catch (error) {
      setNotifications((prev) =>
        prev.map((notif) => (previouslyUnread.has(notif.id) ? { ...notif, unread: true } : notif)),
      );
      throw error;
    }
  }, [notifications]);

  const loadMarketplaceAndUserItems = useCallback(
    async (hasActiveToken: boolean, viewerMunicipalityCode?: string) => {
      const epoch = sessionEpochRef.current;
      setIsItemsLoading(true);
      setLoadStates((prev) => ({
        ...prev,
        items: 'loading',
        routes: hasActiveToken ? 'loading' : prev.routes,
      }));
      try {
        const municipalityCode = viewerMunicipalityCode ?? viewerRef.current.municipalityCode;
        const [allItemsResult, myItemsResult, myRoutesResult] = await Promise.allSettled([
          itemsService.listItems(
            municipalityCode
              ? { scope: viewerRef.current.scope, municipalityCode }
              : undefined,
          ),
          hasActiveToken ? itemsService.listMyItems() : Promise.resolve<Item[]>([]),
          hasActiveToken ? routesService.listMyRoutes() : Promise.resolve<SwapRoute[]>([]),
        ]);

        if (epoch !== sessionEpochRef.current) {
          return; // the session changed while loading: these results belong to the old one
        }
        for (const result of [allItemsResult, myItemsResult, myRoutesResult]) {
          if (result.status === 'rejected') {
            console.error('Could not load session data', result.reason);
          }
        }
        if (allItemsResult.status === 'fulfilled') {
          setItems(allItemsResult.value);
        }
        if (myItemsResult.status === 'fulfilled') {
          setMyItems(myItemsResult.value);
        }
        if (myRoutesResult.status === 'fulfilled') {
          setRoutes(myRoutesResult.value);
        }
        setLoadStates((prev) => ({
          ...prev,
          items:
            allItemsResult.status === 'fulfilled' && myItemsResult.status === 'fulfilled'
              ? 'ready'
              : 'error',
          routes: myRoutesResult.status === 'fulfilled' ? 'ready' : 'error',
        }));
      } finally {
        if (epoch === sessionEpochRef.current) {
          setIsItemsLoading(false);
        }
      }
    },
    [],
  );

  // Reloads only the marketplace (e.g. after the user widens the search area)
  const reloadMarketplace = useCallback(async () => {
    const { scope, municipalityCode } = viewerRef.current;
    setIsItemsLoading(true);
    setLoadState('items', 'loading');
    try {
      setItems(
        await itemsService.listItems(municipalityCode ? { scope, municipalityCode } : undefined),
      );
      setLoadState('items', 'ready');
    } catch {
      setLoadState('items', 'error');
    } finally {
      setIsItemsLoading(false);
    }
  }, [setLoadState]);

  const setLocationScope = useCallback(
    (scope: LocationScopePreference) => {
      preferencesStorage.setLocationScope(scope);
      viewerRef.current = { ...viewerRef.current, scope };
      setLocationScopeState(scope);
      if (viewerRef.current.municipalityCode) {
        void reloadMarketplace();
      }
    },
    [reloadMarketplace],
  );

  const clearSessionData = useCallback(() => {
    setCurrentUser(null);
    setMyItems([]);
    setRoutes([]);
    setNotifications([]);
    setLoadStates({ items: 'ready', routes: 'ready', notifications: 'ready' });
  }, []);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      sessionEpochRef.current += 1;
      setIsAuthenticated(false);
      setItems([]);
      clearSessionData();
    });

    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [clearSessionData]);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      if (!tokenStorage.hasToken()) {
        setIsHydrating(false);
        return;
      }

      setIsHydrating(true);
      const epoch = sessionEpochRef.current;
      const isStale = () => !isMounted || epoch !== sessionEpochRef.current;
      try {
        const user = await authService.getMe();
        if (isStale()) return;
        setCurrentUser(user);
        setIsAuthenticated(true);

        await Promise.all([
          loadMarketplaceAndUserItems(true, user.municipalityCode),
          notificationsService
            .listNotifications()
            .then((list) => {
              if (!isStale()) {
                setNotifications(list);
                setLoadState('notifications', 'ready');
              }
            })
            .catch(() => {
              if (!isStale()) setLoadState('notifications', 'error');
            }),
        ]);
      } catch (error) {
        if (isStale()) return;
        // Only a rejected session ends it; a network or server failure keeps the token so the
        // user can retry instead of being logged out by a cold server.
        const sessionRejected =
          error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403);
        if (sessionRejected) {
          tokenStorage.clearToken();
          setIsAuthenticated(false);
          clearSessionData();
        } else {
          console.error('Could not restore the session', error);
          setLoadStates({ items: 'error', routes: 'error', notifications: 'error' });
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [loadMarketplaceAndUserItems, clearSessionData, setLoadState]);

  // Visibility-aware polling (every 15 s only when authenticated and the page is visible)
  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test') {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const silentPoll = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      // Background refresh: a failed tick keeps the last real data and the next tick retries.
      const epoch = sessionEpochRef.current;
      const [notifsResult, routesResult] = await Promise.allSettled([
        notificationsService.listNotifications(),
        routesService.listMyRoutes(),
      ]);
      if (epoch !== sessionEpochRef.current) return;

      if (notifsResult.status === 'fulfilled') {
        setNotifications(notifsResult.value);
        setLoadState('notifications', 'ready');
      }
      if (routesResult.status === 'fulfilled') {
        setRoutes(routesResult.value);
        setLoadState('routes', 'ready');
      }
    };

    const startPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      intervalId = setInterval(silentPoll, 15000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void silentPoll();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') {
        startPolling();
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [isAuthenticated, setLoadState]);

  const refreshItems = useCallback(async () => {
    const hasActiveToken = tokenStorage.hasToken();
    if (hasActiveToken && !currentUser) {
      // Hydration failed earlier: restore the user first, or the retry would load unscoped data
      const epoch = sessionEpochRef.current;
      try {
        const user = await authService.getMe();
        if (epoch !== sessionEpochRef.current) return;
        setCurrentUser(user);
        setIsAuthenticated(true);
        await Promise.all([
          loadMarketplaceAndUserItems(true, user.municipalityCode),
          refreshNotificationsReal(),
        ]);
      } catch (error) {
        if (epoch !== sessionEpochRef.current) return;
        console.error('Could not restore the session', error);
        setLoadStates({ items: 'error', routes: 'error', notifications: 'error' });
      }
      return;
    }
    await loadMarketplaceAndUserItems(hasActiveToken);
  }, [currentUser, loadMarketplaceAndUserItems, refreshNotificationsReal]);

  const startSession = useCallback(
    async (user: User): Promise<void> => {
      sessionEpochRef.current += 1;
      setCurrentUser(user);
      setIsAuthenticated(true);
      await Promise.all([
        loadMarketplaceAndUserItems(true, user.municipalityCode),
        refreshNotificationsReal(),
      ]);
    },
    [loadMarketplaceAndUserItems, refreshNotificationsReal],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<User> => {
      const session = await authService.login(email, password);
      await startSession(session.user);
      return session.user;
    },
    [startSession],
  );

  const registerWithEmail = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      const session = await authService.register(payload);
      await startSession(session.user);
      return session.user;
    },
    [startSession],
  );

  const logout = useCallback(() => {
    authService.logout();
    sessionEpochRef.current += 1;
    setIsAuthenticated(false);
    setItems([]);
    clearSessionData();
  }, [clearSessionData]);

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
    if (payload.municipalityCode) {
      viewerRef.current = { ...viewerRef.current, municipalityCode: updatedUser.municipalityCode };
      void reloadMarketplace();
    }
    return updatedUser;
  }, [reloadMarketplace]);

  const uploadAvatarReal = useCallback(async (imageDataUrl: string): Promise<User> => {
    const updatedUser = await authService.uploadAvatar(imageDataUrl);
    setCurrentUser(updatedUser);
    return updatedUser;
  }, []);

  const searchRoutesReal = useCallback(
    async (params: SearchRoutesPayload): Promise<SwapRoute[]> => {
      // Users with a registered municipality search inside the area they chose; others, nationwide
      const { scope, municipalityCode } = viewerRef.current;
      return routesService.searchRoutes({
        scope: municipalityCode ? scope : 'country',
        ...params,
      });
    },
    [],
  );

  const upsertRoute = useCallback((route: SwapRoute, alsoMatchId?: string) => {
    setRoutes((prev) => {
      const exists = prev.some((r) => r.id === route.id || r.id === alsoMatchId);
      return exists
        ? prev.map((r) => (r.id === route.id || r.id === alsoMatchId ? route : r))
        : [route, ...prev];
    });
  }, []);

  const proposeRouteReal = useCallback(
    async (routeOrPayload: SwapRoute | ProposeRoutePayload): Promise<SwapRoute> => {
      const proposedRoute = await routesService.proposeRoute(toProposePayload(routeOrPayload));
      upsertRoute(proposedRoute);
      return proposedRoute;
    },
    [upsertRoute],
  );

  const respondToProposalReal = useCallback(
    async (routeId: string, decision: RouteDecision, comment?: string): Promise<SwapRoute> => {
      const updatedRoute = await routesService.respondToRoute(routeId, decision, comment);
      upsertRoute(updatedRoute, routeId);
      return updatedRoute;
    },
    [upsertRoute],
  );

  const completeSwapReal = useCallback(
    async (routeId: string): Promise<SwapRoute> => {
      const completedRoute = await routesService.completeRoute(routeId);
      upsertRoute(completedRoute, routeId);
      return completedRoute;
    },
    [upsertRoute],
  );

  const cancelRouteReal = useCallback(
    async (routeId: string): Promise<SwapRoute> => {
      const cancelledRoute = await routesService.cancelRoute(routeId);
      upsertRoute(cancelledRoute, routeId);
      return cancelledRoute;
    },
    [upsertRoute],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser,
      loadStates,
      isAuthenticated,
      isHydrating,
      isItemsLoading,
      items,
      myItems,
      routes,
      proposals,
      notifications,
      unreadNotificationsCount,
      loginWithEmail,
      registerWithEmail,
      logout,
      refreshItems,
      createItemReal,
      deleteItemReal,
      updateProfileReal,
      uploadAvatarReal,
      searchRoutesReal,
      proposeRouteReal,
      respondToProposalReal,
      completeSwapReal,
      cancelRouteReal,
      locationScope,
      setLocationScope,
      refreshRoutesReal,
      markNotificationReadReal,
      markAllNotificationsReadReal,
      refreshNotificationsReal,
    }),
    [
      currentUser,
      loadStates,
      isAuthenticated,
      isHydrating,
      isItemsLoading,
      items,
      myItems,
      routes,
      proposals,
      notifications,
      unreadNotificationsCount,
      loginWithEmail,
      registerWithEmail,
      logout,
      refreshItems,
      createItemReal,
      deleteItemReal,
      updateProfileReal,
      uploadAvatarReal,
      searchRoutesReal,
      proposeRouteReal,
      respondToProposalReal,
      completeSwapReal,
      cancelRouteReal,
      locationScope,
      setLocationScope,
      refreshRoutesReal,
      markNotificationReadReal,
      markAllNotificationsReadReal,
      refreshNotificationsReal,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/** Value for components rendered outside the provider: empty data, services still reachable. */
const fallbackContextValue: AppContextValue = {
  currentUser: null,
  loadStates: { items: 'ready', routes: 'ready', notifications: 'ready' },
  isAuthenticated: false,
  isHydrating: false,
  isItemsLoading: false,
  items: [],
  myItems: [],
  routes: [],
  proposals: [],
  notifications: [],
  unreadNotificationsCount: 0,
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
  uploadAvatarReal: async (imageDataUrl) => authService.uploadAvatar(imageDataUrl),
  searchRoutesReal: async (params) => routesService.searchRoutes(params),
  proposeRouteReal: async (routeOrPayload) =>
    routesService.proposeRoute(toProposePayload(routeOrPayload)),
  respondToProposalReal: async (routeId, decision, comment) =>
    routesService.respondToRoute(routeId, decision, comment),
  completeSwapReal: async (routeId) => routesService.completeRoute(routeId),
  cancelRouteReal: async (routeId) => routesService.cancelRoute(routeId),
  locationScope: 'country',
  setLocationScope: () => undefined,
  refreshRoutesReal: async () => routesService.listMyRoutes(),
  markNotificationReadReal: async (id: string) => {
    await notificationsService.markAsRead(id);
  },
  markAllNotificationsReadReal: async () => {
    await notificationsService.markAllAsRead();
  },
  refreshNotificationsReal: async () => {
    return notificationsService.listNotifications();
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  return context ?? fallbackContextValue;
};

export default AppContext;
