import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatMatchScore } from '@/services/routes/routes.service';
import { RouteCard } from '@/components/RouteCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCop } from '@/utils/currency';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { getNoRoutesReason, isOfferableItem } from '@/utils/swapSearch';

interface ResultsLocationState {
  routes?: SwapRoute[];
  /** Set by Searching when its engine call finished, even with zero routes. */
  searchCompleted?: boolean;
  offeredItemId?: string;
  wantItemId?: string;
  objectiveText?: string;
  desiredCategory?: string;
  maxSteps?: number;
  valueTolerancePct?: number;
}

export const RouteResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const { searchRoutesReal, myItems, isItemsLoading, loadStates } = useApp();
  const [searchParams] = useSearchParams();
  const locationState = location.state as ResultsLocationState | null;

  const haveId = searchParams.get('have') || locationState?.offeredItemId || '';
  const wantId = searchParams.get('want') || locationState?.wantItemId || '';
  const objectiveText = searchParams.get('q') || locationState?.objectiveText || wantId;
  const hasSearchParams = haveId !== '' && objectiveText !== '';
  const maxSteps = Number(searchParams.get('maxSteps')) || locationState?.maxSteps || 4;
  const valueTolerancePct =
    Number(searchParams.get('tolerance')) || locationState?.valueTolerancePct || 25;

  const [routes, setRoutes] = useState<SwapRoute[]>(() => locationState?.routes || []);
  const hasSearchAnswer =
    locationState?.searchCompleted === true ||
    (locationState?.routes !== undefined && locationState.routes.length > 0);
  const [isLoading, setIsLoading] = useState<boolean>(() => !hasSearchAnswer);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [hopFilter, setHopFilter] = useState<'all' | 2 | 3 | 4>('all');

  useEffect(() => {
    if (!hasSearchParams) {
      return;
    }
    // The Searching screen already ran this search; only repeat it on retry, direct entry
    // or when that search failed or had not answered yet.
    if (reloadKey === 0 && hasSearchAnswer) {
      return;
    }
    let isMounted = true;

    const loadRoutes = async () => {
      setLoadFailed(false);
      if (!hasSearchAnswer) {
        setIsLoading(true);
      }
      try {
        const result = await searchRoutesReal({
          offeredItemId: haveId,
          objectiveText,
          desiredCategory: locationState?.desiredCategory,
          maxSteps,
          valueTolerancePct,
        });
        if (isMounted) {
          setRoutes(result);
        }
      } catch (error: unknown) {
        console.error('Route search failed on the Results screen', error);
        if (isMounted) {
          setLoadFailed(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRoutes();

    return () => {
      isMounted = false;
    };
  }, [
    hasSearchParams,
    reloadKey,
    haveId,
    wantId,
    objectiveText,
    maxSteps,
    valueTolerancePct,
    locationState?.desiredCategory,
    hasSearchAnswer,
    searchRoutesReal,
  ]);

  const noRoutesReason = getNoRoutesReason({
    loaded: !isItemsLoading && loadStates.items === 'ready',
    publishedCount: myItems.filter(isOfferableItem).length,
  });

  const filteredRoutes =
    hopFilter === 'all' ? routes : routes.filter((r) => r.stepsCount === hopFilter);

  if (!hasSearchParams) {
    return <Navigate to="/swap/configure" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 bg-surface">
        <div className="px-margin pt-4 pb-2">
          <div className="h-8 w-52 bg-surface-container-low rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-36 bg-surface-container-low rounded-md animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto px-margin py-4">
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="rounded-2xl p-4 bg-surface-container-low border border-surface-container-high/60 animate-pulse flex flex-col gap-3"
              >
                {/* Header row: badge and participants indicator + action pill */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 rounded-full bg-surface-container-high" />
                    <div className="h-4 w-20 rounded-md bg-surface-container-high" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-surface-container-high" />
                </div>

                {/* Inner target item card container */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-surface-container-high/60">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high shrink-0" />
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="h-4 w-3/4 rounded-md bg-surface-container-high" />
                    <div className="h-3 w-1/2 rounded-md bg-surface-container-high" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-surface">
      <div className="px-margin pt-4 pb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-0.5">
              {t('routeResults.title')}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('routeResults.available', { count: filteredRoutes.length })}
            </p>
          </div>
          <Badge variant="primary-subtle" icon="hub">
            {t('routeResults.aiCycles')}
          </Badge>
        </div>

        {/* Cycle Hop Filter Pills (All / 2-hop / 3-hop / 4-hop) */}
        {routes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { key: 'all', label: t('routeResults.filters.all') },
                { key: 2, label: t('routeResults.filters.two') },
                { key: 3, label: t('routeResults.filters.three') },
                { key: 4, label: t('routeResults.filters.four') },
              ] as const
            ).map((pill) => {
              const isActive = hopFilter === pill.key;
              return (
                <button
                  key={String(pill.key)}
                  type="button"
                  onClick={() => setHopFilter(pill.key)}
                  className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-margin py-4">
        {loadFailed && routes.length === 0 ? (
          <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
        ) : filteredRoutes.length === 0 && hopFilter !== 'all' ? (
          <EmptyState
            iconName="filter_alt_off"
            title={t('routeResults.emptyFilterTitle')}
            action={
              <Button variant="primary" onClick={() => setHopFilter('all')}>
                {t('routeResults.showAll')}
              </Button>
            }
          />
        ) : filteredRoutes.length === 0 && noRoutesReason === 'noItems' ? (
          <EmptyState
            illustration="routes"
            title={t('routeResults.noItemsTitle')}
            description={t('routeResults.noItemsDescription')}
            action={
              <Button variant="primary" onClick={() => navigate('/publish')}>
                {t('routeResults.publishItem')}
              </Button>
            }
          />
        ) : filteredRoutes.length === 0 ? (
          <EmptyState
            iconName="search_off"
            title={t(
              noRoutesReason === 'noCycles'
                ? 'routeResults.noCyclesTitle'
                : 'routeResults.noRoutesTitle',
            )}
            description={
              noRoutesReason === 'noCycles' ? t('routeResults.noCyclesDescription') : undefined
            }
            action={
              <Button variant="primary" onClick={() => navigate('/swap/configure')}>
                {t('routeResults.changeSearch')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {filteredRoutes.map((route) => {
              const matchPct = formatMatchScore(route.matchScore);

              return (
                <div key={route.id} className="flex flex-col gap-2">
                  <RouteCard
                    route={route}
                    onClick={() => navigate('/swap/route/' + route.id, { state: { route } })}
                  />

                  {/* AI Fairness Explanation & Step Values Card */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {matchPct !== null && (
                        <div className="flex items-center gap-1.5 text-primary">
                          <Icon name="auto_awesome" size="xs" filled />
                          <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                            {t('routeResults.aiVerified', { percent: matchPct })}
                          </span>
                        </div>
                      )}
                      <span className="font-label-sm text-[11px] font-bold text-[#1a7a4a] flex items-center gap-1">
                        <Icon name="eco" size="xs" filled />
                        -{route.co2SavedKg} kg CO₂
                      </span>
                    </div>

                    {route.aiExplanation && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                        {route.aiExplanation}
                      </p>
                    )}

                    {/* Step Item Values Breakdown */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                      {route.chainItems.map((item, idx) => (
                        <div
                          key={`${route.id}-${item.id}-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-container-lowest border border-surface-container-high/60 shrink-0"
                        >
                          <span className="font-label-sm text-[10px] text-on-surface-variant truncate max-w-[85px]">
                            {item.name.split(' ')[0]}:
                          </span>
                          {item.estimatedValue !== undefined && (
                            <span className="font-label-sm text-[10px] text-primary font-bold">
                              {formatCop(item.estimatedValue)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
