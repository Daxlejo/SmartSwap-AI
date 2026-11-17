import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { LocationPrompt } from '@/components/LocationPrompt';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { SwapRing } from '@/components/SwapRing';
import { ExampleRing } from '@/components/ExampleRing';
import { useExampleRingPeople } from '@/hooks/useExampleRingPeople';
import { toRingParticipants } from '@/utils/swapRing';
import { isOfferableItem } from '@/utils/swapSearch';

const INACTIVE_ROUTE_STATUSES = new Set(['CANCELLED', 'EXPIRED', 'COMPLETED']);

export const HomeScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    currentUser,
    myItems,
    routes,
    loadStates,
    refreshItems,
  } = useApp();

  const activeRoutes = routes.filter(
    (route) => !INACTIVE_ROUTE_STATUSES.has((route.status || '').toUpperCase()),
  );
  const activeRoute = activeRoutes[0];
  const activeRouteTarget = activeRoute?.chainItems[activeRoute.chainItems.length - 1];
  const activeUserItemsCount = myItems.length;
  // Until the user has one active item there is nothing to offer, so publishing comes first.
  // Only decided once the items loaded: while loading or after an error the usual layout stays.
  const hasActiveItem = loadStates.items !== 'ready' || myItems.some(isOfferableItem);
  const examplePeople = useExampleRingPeople();
  const activeRing = useMemo(() => toRingParticipants(activeRoute?.steps ?? []), [activeRoute]);

  const openActiveRoute = () => {
    if (!activeRoute) return;
    navigate(`/swap/route/${activeRoute.code || activeRoute.id}`, {
      state: { route: activeRoute },
    });
  };

  return (
    <div className="flex flex-col w-full px-margin pt-4 space-y-6">
      <LocationPrompt />

      <ScreenHeader
        title={
          currentUser?.name
            ? t('home.greeting', { name: currentUser.name.split(' ')[0] })
            : t('home.greetingAnonymous')
        }
        subtitle={t('home.subtitle')}
        trailing={<NotificationBell />}
      />

      {hasActiveItem ? (
        <section aria-label={t('home.quickActions')} className="grid grid-cols-2 gap-space-sm">
          {/* Main action: the swap ring explained, and the way into a new swap */}
          <div
            data-testid="home-ring-card"
            className="col-span-2 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm px-3 pt-4 pb-4 flex flex-col items-center gap-3"
          >
            <ExampleRing people={examplePeople} viewerId={currentUser?.id} />
            <div className="flex flex-col gap-1 text-center px-1">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                {t('home.engine.title')}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {t('home.engine.description')}
              </p>
            </div>
            <Button
              data-testid="home-new-swap"
              variant="primary"
              size="lg"
              fullWidth
              rightIcon="arrow_forward"
              onClick={() => navigate('/swap/configure')}
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
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {t('home.publish.title')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('home.publish.itemsPublished', { count: activeUserItemsCount })}
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
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {t('home.activeRoutes.title')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('home.activeRoutes.circuits', { count: activeRoutes.length })}
              </span>
            </span>
          </button>
        </section>
      ) : (
        <section aria-label={t('home.quickActions')} className="flex flex-col gap-space-sm">
          {/* First item: publishing is the main action, with the reason in one line */}
          <div
            data-testid="home-first-item"
            className="rounded-2xl bg-hero p-space-md text-on-hero shadow-md flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-headline-md text-on-hero font-bold">
                {t('home.firstItem.title')}
              </h2>
              <p className="font-body-md text-body-md text-on-hero-variant">
                {t('home.firstItem.reason')}
              </p>
            </div>
            <Button
              variant="tonal"
              size="lg"
              fullWidth
              leftIcon="add_a_photo"
              onClick={() => navigate('/publish')}
              className="bg-surface text-primary hover:bg-surface-container-low"
            >
              {t('home.firstItem.cta')}
            </Button>
          </div>

          {/* Searching stays available but secondary, saying why it waits */}
          <div
            data-testid="home-search-secondary"
            className="rounded-2xl bg-surface-container-lowest border border-surface-container-high p-space-md flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <Icon name="sync_alt" size="lg" className="text-secondary shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  {t('home.engine.title')}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t('home.firstItem.searchReason')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              fullWidth
              rightIcon="arrow_forward"
              onClick={() => navigate('/swap/configure')}
            >
              {t('home.engine.cta')}
            </Button>
          </div>
        </section>
      )}

      {hasActiveItem && !activeRoute && loadStates.routes === 'ready' && (
        <EmptyState
          illustration="routes"
          title={t('states.homeRoutes')}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/swap/configure')}>
              {t('states.homeRoutesCta')}
            </Button>
          }
        />
      )}

      {!activeRoute && loadStates.routes === 'error' && (
        <ErrorState onRetry={() => void refreshItems()} />
      )}

      {activeRoute && (
        <section aria-label={t('home.route.aria')} className="flex flex-col gap-3">
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
            {t('home.route.title')}
          </h2>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high p-space-md shadow-sm">
            {activeRing ? (
              <SwapRing
                participants={activeRing}
                currentUserId={currentUser?.id}
                variant="compact"
                onFindAnotherRoute={() => navigate('/swap/configure')}
              />
            ) : (
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
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('home.route.receives')}
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface break-words">
                    {activeRouteTarget?.name}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('home.route.people', {
                      count: activeRoute.participants?.length || activeRoute.stepsCount,
                    })}
                  </span>
                </div>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              rightIcon="arrow_forward"
              onClick={openActiveRoute}
            >
              {t('home.route.view')}
            </Button>
          </div>
        </section>
      )}

    </div>
  );
};
