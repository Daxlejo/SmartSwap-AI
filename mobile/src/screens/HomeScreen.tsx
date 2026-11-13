import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { LocationPrompt } from '@/components/LocationPrompt';
import { LocationScopeSelector } from '@/components/LocationScopeSelector';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ObjectCard } from '@/components/ObjectCard';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';

const INACTIVE_ROUTE_STATUSES = new Set(['CANCELLED', 'EXPIRED', 'COMPLETED']);

export const HomeScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    currentUser,
    items,
    myItems,
    routes,
    loadStates,
    isItemsLoading,
    refreshItems,
    locationScope,
    setLocationScope,
  } = useApp();

  const [filterMode, setFilterMode] = useState<'nearby' | 'wishlist'>('nearby');

  const activeRoutes = routes.filter(
    (route) => !INACTIVE_ROUTE_STATUSES.has((route.status || '').toUpperCase()),
  );
  const activeRoute = activeRoutes[0];
  const activeRouteTarget = activeRoute?.chainItems[activeRoute.chainItems.length - 1];
  const activeUserItemsCount = myItems.length;

  const isLoading = isItemsLoading || loadStates.items === 'loading';
  const hasError = loadStates.items === 'error';
  const otherItems = useMemo(
    () => items.filter((i) => i.ownerId !== currentUser?.id),
    [items, currentUser?.id],
  );

  const displayedItems = useMemo(() => {
    if (filterMode !== 'wishlist') return otherItems;
    const wanted = myItems.flatMap((item) => item.wants.map((want) => want.trim().toLowerCase()));
    return otherItems.filter((item) => {
      const name = item.name.toLowerCase();
      return wanted.some((want) => want.length > 1 && name.includes(want));
    });
  }, [filterMode, otherItems, myItems]);

  const openActiveRoute = () => {
    if (!activeRoute) return;
    navigate(`/swap/route/${activeRoute.code || activeRoute.id}`, { state: { route: activeRoute } });
  };

  return (
    <div className="flex flex-col w-full px-margin pt-4 space-y-6">
      <LocationPrompt />

      <section className="flex flex-col gap-1">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold break-words">
          {currentUser?.name
            ? t('home.greeting', { name: currentUser.name.split(' ')[0] })
            : t('home.greetingAnonymous')}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{t('home.subtitle')}</p>
      </section>

      <section aria-label={t('home.quickActions')} className="grid grid-cols-2 gap-space-sm">
        {/* Main action: one title, one line, one button */}
        <div className="col-span-2 rounded-2xl bg-hero p-space-md text-on-hero shadow-md flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-md text-headline-md text-on-hero font-bold">{t('home.engine.title')}</h2>
            <p className="font-body-md text-body-md text-on-hero-variant">{t('home.engine.description')}</p>
          </div>
          <Button
            variant="tonal"
            size="lg"
            fullWidth
            rightIcon="arrow_forward"
            onClick={() => navigate('/swap/configure')}
            className="bg-surface text-primary hover:bg-surface-container-low"
          >
            {t('home.engine.cta')}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/publish')}
          className="min-h-[7.5rem] flex flex-col justify-start gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-xs hover:bg-surface-container-low transition-colors text-left active:scale-[0.98]"
        >
          <Icon name="add_a_photo" size="lg" className="text-primary" />
          <span className="flex flex-col gap-0.5">
            <span className="font-headline-sm text-headline-sm text-on-surface">{t('home.publish.title')}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {activeUserItemsCount > 0
                ? t('home.publish.itemsPublished', { count: activeUserItemsCount })
                : t('home.publish.empty')}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/swaps')}
          className="min-h-[7.5rem] flex flex-col justify-start gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-xs hover:bg-surface-container-low transition-colors text-left active:scale-[0.98]"
        >
          <Icon name="sync_alt" size="lg" className="text-secondary" />
          <span className="flex flex-col gap-0.5">
            <span className="font-headline-sm text-headline-sm text-on-surface">{t('home.activeRoutes.title')}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t('home.activeRoutes.circuits', { count: activeRoutes.length })}
            </span>
          </span>
        </button>
      </section>

      {!activeRoute && loadStates.routes === 'ready' && (
        <EmptyState
          illustration="routes"
          title={activeUserItemsCount > 0 ? t('states.homeRoutes') : t('states.homeNoItems')}
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(activeUserItemsCount > 0 ? '/swap/configure' : '/publish')}
            >
              {activeUserItemsCount > 0 ? t('states.homeRoutesCta') : t('states.homeNoItemsCta')}
            </Button>
          }
        />
      )}

      {!activeRoute && loadStates.routes === 'error' && <ErrorState onRetry={() => void refreshItems()} />}

      {activeRoute && (
        <section aria-label={t('home.route.aria')} className="flex flex-col gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{t('home.route.title')}</h2>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high p-space-md shadow-sm">
            <div className="flex items-center gap-3">
              {activeRouteTarget && (
                <ItemImage
                  src={activeRouteTarget.imageUrl}
                  alt={activeRouteTarget.name}
                  category={activeRouteTarget.category}
                  className="w-16 h-16 rounded-xl bg-surface-container-high shrink-0"
                />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm text-body-sm text-on-surface-variant">{t('home.route.receives')}</span>
                <span className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 break-words">
                  {activeRouteTarget?.name}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('home.route.people', { count: activeRoute.participants?.length || activeRoute.stepsCount })}
                </span>
              </div>
            </div>
            <Button variant="primary" size="lg" fullWidth rightIcon="arrow_forward" onClick={openActiveRoute}>
              {t('home.route.view')}
            </Button>
          </div>
        </section>
      )}

      <section aria-label={t('home.recommended.aria')} className="flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{t('home.recommended.title')}</h2>
        <div role="group" aria-label={t('home.recommended.filterAria')} className="flex items-center gap-2">
          <Chip
            active={filterMode === 'nearby'}
            aria-pressed={filterMode === 'nearby'}
            onClick={() => setFilterMode('nearby')}
          >
            {t('home.recommended.nearby')}
          </Chip>
          <Chip
            active={filterMode === 'wishlist'}
            aria-pressed={filterMode === 'wishlist'}
            onClick={() => setFilterMode('wishlist')}
          >
            {t('home.recommended.wishlist')}
          </Chip>
        </div>

        <LocationScopeSelector />

        {isLoading && (
          <div className="flex flex-col space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-surface-container-low animate-pulse border border-surface-container-high"
              />
            ))}
          </div>
        )}

        {!isLoading && hasError && <ErrorState onRetry={() => void refreshItems()} />}

        {!isLoading && !hasError && displayedItems.length === 0 && (
          <EmptyState
            illustration="search"
            title={
              filterMode === 'wishlist'
                ? t('home.recommended.emptyDescription')
                : locationScope !== 'country'
                  ? t('states.homeCatalog')
                  : t('states.explore')
            }
            action={
              filterMode === 'wishlist' ? (
                <Button variant="primary" size="md" onClick={() => setFilterMode('nearby')}>
                  {t('home.recommended.nearby')}
                </Button>
              ) : locationScope !== 'country' ? (
                <Button variant="primary" size="md" onClick={() => setLocationScope('country')}>
                  {t('states.homeCatalogCta')}
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={() => navigate('/publish')}>
                  {t('states.exploreCta')}
                </Button>
              )
            }
          />
        )}

        {!isLoading && !hasError && displayedItems.length > 0 && (
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
