import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item, User, SwapRoute } from '@/types';
import { useApp } from '@/context/AppContext';
import { getCurrentUser, getItems, getRecommendedRoutes } from '@/services/swapService';
import { mockSwapRoute } from '@/data/mockData';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { ObjectCard } from '@/components/ObjectCard';

export const HomeScreen = () => {
  const navigate = useNavigate();
  const {
    currentUser: contextUser,
    items: contextItems,
    myItems,
    routes,
  } = useApp();

  const [localUser, setLocalUser] = useState<User | null>(null);
  const [recommendedRoute, setRecommendedRoute] = useState<SwapRoute | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<'nearby' | 'wishlist'>('nearby');
  const [showRouteExplanation, setShowRouteExplanation] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [userData, itemsData, routesData] = await Promise.all([
          getCurrentUser(),
          getItems(),
          getRecommendedRoutes(),
        ]);

        if (isMounted) {
          setLocalUser(userData);
          setItems(itemsData);
          if (routesData.length > 0) {
            setRecommendedRoute(routesData[0]);
          }
        }
      } catch {
        if (isMounted) {
          setError('No pudimos cargar los datos de la red. Por favor intenta de nuevo.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = contextUser || localUser;
  const activeRoute = routes.length > 0 ? routes[0] : recommendedRoute || mockSwapRoute;
  const activeRoutesCount = routes.length > 0 ? routes.length : 3;
  const activeUserItemsCount = myItems.length;

  const allItems = contextItems.length > 0 ? contextItems : items;
  const otherItems = allItems.filter((i) => i.ownerId !== currentUser?.id);

  const displayedItems = useMemo(() => {
    return filterMode === 'wishlist'
      ? otherItems.filter((item) => ['Fotografía', 'Tecnología'].includes(item.category))
      : otherItems;
  }, [filterMode, otherItems]);

  return (
    <div className="flex flex-col w-full px-margin pt-4 pb-8 space-y-5">
      {/* Greeting & Environmental Impact Pill */}
      <section className="flex items-start justify-between gap-space-sm">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-space-xs">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Hola, {currentUser?.name?.split(' ')[0] || 'Alex'}
            </h1>
            <span className="text-xl">👋</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Encuentra tu próximo canje sin dinero
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high shadow-xs">
            <Icon name="eco" size="sm" filled className="text-primary" />
            <span className="font-label-sm text-label-sm text-primary font-bold">
              {currentUser?.co2SavedKg ?? 14.2} kg CO₂ Ahorrados
            </span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10">
            <Icon name="swap_horiz" size="xs" className="text-primary" />
            <span className="font-label-sm text-[11px] text-primary font-bold">
              {currentUser?.tradesCompleted ?? 23} canjes completados
            </span>
          </div>
        </div>
      </section>

      {/* Live Swap Ticker */}
      <section
        aria-label="Actividad en vivo"
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-surface-container-low shadow-xs border border-surface-container-high/60 overflow-hidden"
      >
        <div className="relative flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-secondary-container text-on-primary">
          <Icon name="electric_bolt" size="xs" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider shrink-0">
            Canje en vivo
          </span>
          <span className="font-body-sm text-body-sm text-on-surface truncate">
            Carlos aceptó intercambio por{' '}
            <strong className="font-semibold text-on-surface">Keychron Q1 Pro</strong>
          </span>
        </div>
        <span className="font-label-sm text-label-sm text-outline shrink-0">hace 5m</span>
      </section>

      {/* Quick Action Bento Grid */}
      <section aria-label="Acciones rápidas" className="grid grid-cols-2 gap-space-sm">
        {/* Card 1: Primary Action -> ConfigureSwap */}
        <div className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-tertiary p-space-md text-on-primary shadow-md">
          <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative z-10 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md">
                <Icon name="auto_awesome" size="xs" className="text-primary-fixed" />
                <span className="font-label-sm text-label-sm font-bold text-primary-fixed">
                  Motor de Emparejamiento
                </span>
              </div>
              <Icon name="swap_calls" size="lg" className="text-primary-fixed" />
            </div>

            <div className="space-y-1">
              <h2 className="font-headline-sm text-headline-sm text-white font-bold">
                Buscar un Canje Circular
              </h2>
              <p className="font-body-sm text-body-sm text-primary-fixed/90 leading-relaxed">
                Empareja lo que ofreces con los artículos que deseas en un circuito colaborativo.
              </p>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <Button
                variant="tonal"
                size="md"
                rightIcon="arrow_forward"
                onClick={() => navigate('/swap/configure')}
                className="bg-surface text-primary hover:bg-surface-container-low font-bold shadow-xs"
              >
                Encontrar canje
              </Button>
              <span className="font-label-sm text-label-sm text-primary-fixed/90 font-medium">
                98% coincidencia
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Publish Item / Live Active User Items */}
        <button
          type="button"
          onClick={() => navigate('/publish')}
          className="flex flex-col justify-between p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs hover:bg-surface-container-low transition-colors text-left active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <Icon name="add_a_photo" size="md" />
            </div>
            <span className="font-label-sm text-label-sm text-outline font-semibold">
              {activeUserItemsCount > 0 ? `${activeUserItemsCount} activos` : 'Rápido'}
            </span>
          </div>
          <div className="mt-3">
            <h3 className="font-headline-sm text-[15px] font-bold text-on-surface">Publicar</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {activeUserItemsCount > 0
                ? `${activeUserItemsCount} ${activeUserItemsCount === 1 ? 'artículo en canje' : 'artículos en canje'}`
                : 'En 60 segundos'}
            </p>
          </div>
        </button>

        {/* Card 3: Active Swaps / Live Route Counts */}
        <button
          type="button"
          onClick={() => navigate('/swaps')}
          className="flex flex-col justify-between p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs hover:bg-surface-container-low transition-colors text-left active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary">
              <Icon name="sync_alt" size="md" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold animate-pulse">
              {activeRoutesCount} {activeRoutesCount === 1 ? 'activa' : 'nuevas'}
            </span>
          </div>
          <div className="mt-3">
            <h3 className="font-headline-sm text-[15px] font-bold text-on-surface">Rutas Activas</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {activeRoutesCount} {activeRoutesCount === 1 ? 'circuito' : 'circuitos'}
            </p>
          </div>
        </button>
      </section>

      {/* Signature Section: Recommended Circular Chain */}
      {activeRoute && (
        <section aria-label="Ruta encontrada para ti" className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="route" size="md" className="text-secondary" />
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Ruta Encontrada Para Ti
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(`/swap/route/${activeRoute.code || activeRoute.id || 'SR-8492'}`, {
                  state: { route: activeRoute },
                })
              }
              className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-0.5 hover:underline"
            >
              <span>Ver ruta</span>
              <Icon name="chevron_right" size="xs" />
            </button>
          </div>

          {/* Chain Card */}
          <div className="flex flex-col rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 p-space-md shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="secondary-subtle" icon="auto_mode">
                Circuito Colaborativo ({activeRoute.stepsCount} Pasos)
              </Badge>
              <div className="flex items-center gap-1 text-primary bg-surface-container-low px-2.5 py-1 rounded-full">
                <Icon name="verified" size="xs" />
                <span className="font-label-sm text-label-sm font-bold">
                  Coincidencia: 100%
                </span>
              </div>
            </div>

            {/* Target and economics */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider">
                  Objetivo Deseado
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                  Cámara Fujifilm X-T30 II
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">
                  $0 gastados
                </span>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {activeRoute.participants?.length || 0} personas en el circuito
                </p>
              </div>
            </div>

            {/* Visual Chain Horizontal Flow */}
            <div className="flex flex-col space-y-2 p-3 rounded-xl bg-surface-container-low">
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                <span>Tu artículo</span>
                <Icon name="trending_flat" size="sm" className="text-primary" />
                <span>Artículo deseado</span>
              </div>

              {/* Chain Steps */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                {activeRoute.chainItems?.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === activeRoute.chainItems.length - 1;

                  return (
                    <div key={item.id} className="flex items-center shrink-0">
                      <div className="flex flex-col items-center min-w-[56px]">
                        <div
                          className={`relative w-12 h-12 rounded-xl bg-surface-container-highest overflow-hidden shadow-xs flex items-center justify-center ${
                            isLast ? 'ring-2 ring-primary ring-offset-1' : ''
                          }`}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          {isFirst && (
                            <span className="absolute bottom-0 right-0 px-1 bg-primary text-on-primary rounded-tl-md font-label-sm text-[8px] font-bold">
                              Tú
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-label-sm text-[11px] font-semibold text-center mt-1 truncate max-w-[60px] ${
                            isLast ? 'text-primary font-bold' : 'text-on-surface'
                          }`}
                        >
                          {item.name.split(' ')[0]}
                        </span>
                      </div>

                      {!isLast && (
                        <div className="flex flex-col items-center px-0.5 shrink-0 text-primary">
                          <Icon name="sync_alt" size="xs" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                variant="tonal"
                size="sm"
                leftIcon="lightbulb"
                onClick={() => setShowRouteExplanation(!showRouteExplanation)}
              >
                ¿Cómo funciona?
              </Button>
              <Button
                variant="primary"
                size="md"
                rightIcon="explore"
                onClick={() =>
                  navigate(`/swap/route/${activeRoute.code || activeRoute.id || 'SR-8492'}`, {
                    state: { route: activeRoute },
                  })
                }
              >
                Ver ruta
              </Button>
            </div>

            {/* Explainer Drawer */}
            {showRouteExplanation && (
              <div className="p-3 rounded-xl bg-surface-container text-on-surface-variant font-body-sm text-body-sm leading-relaxed border border-surface-container-high">
                <div className="flex items-center gap-1.5 font-headline-sm text-label-md font-bold text-on-surface mb-1">
                  <Icon name="psychology" size="sm" className="text-secondary" />
                  <span>Dinámica del Intercambio Colaborativo</span>
                </div>
                <p>
                  Alex entrega su bicicleta Trek a Carlos; Carlos entrega el balón a Laura; Laura
                  entrega sus auriculares Sony a Diego; Diego entrega su MacBook a Sofía; y Sofía
                  entrega la cámara Fujifilm a Alex. Todos reciben el artículo que buscaban sin dinero
                  directo de por medio.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 'You Might Like' Section */}
      <section aria-label="Artículos recomendados" className="flex flex-col space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Te Podría Interesar
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Basado en tus preferencias de canje
            </p>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-high p-0.5 rounded-xl">
            <Chip
              active={filterMode === 'nearby'}
              onClick={() => setFilterMode('nearby')}
              className="h-8 px-2.5 text-[12px]"
            >
              Cercanos
            </Chip>
            <Chip
              active={filterMode === 'wishlist'}
              onClick={() => setFilterMode('wishlist')}
              className="h-8 px-2.5 text-[12px]"
            >
              Deseados
            </Chip>
          </div>
        </div>

        {/* Data Loading State */}
        {isLoading && (
          <div className="flex flex-col space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-surface-container-low animate-pulse border border-surface-container-high/60"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-4 rounded-2xl bg-error-container/30 text-error text-center font-body-sm text-body-sm">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && displayedItems.length === 0 && (
          <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-surface-container-high/60">
            <Icon name="search_off" size="xl" className="text-outline mb-2" />
            <p className="font-body-md text-body-md text-on-surface font-semibold">
              No se encontraron artículos con este filtro
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Prueba cambiando a &quot;Cercanos&quot; para ver más opciones en tu ciudad.
            </p>
          </div>
        )}

        {/* Item List */}
        {!isLoading && !error && displayedItems.length > 0 && (
          <div className="flex flex-col space-y-3">
            {displayedItems.map((item) => (
              <ObjectCard
                key={item.id}
                item={item}
                onOfferSwap={() =>
                  navigate('/swap/configure', {
                    state: { wantItemId: item.id, wantItemName: item.name },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
