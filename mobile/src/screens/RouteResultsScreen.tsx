import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatMatchScore } from '@/services/routes/routes.service';
import { RouteCard } from '@/components/RouteCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

interface ResultsLocationState {
  routes?: SwapRoute[];
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
  const { searchRoutesReal } = useApp();
  const [searchParams] = useSearchParams();
  const locationState = location.state as ResultsLocationState | null;

  const haveId = searchParams.get('have') || locationState?.offeredItemId || 'item-bike';
  const wantId = searchParams.get('want') || locationState?.wantItemId || 'item-camera';
  const objectiveText =
    searchParams.get('q') || locationState?.objectiveText || wantId || 'Cámara Fujifilm X-T30 II';
  const maxSteps = Number(searchParams.get('maxSteps')) || locationState?.maxSteps || 4;
  const valueTolerancePct =
    Number(searchParams.get('tolerance')) || locationState?.valueTolerancePct || 25;

  const [routes, setRoutes] = useState<SwapRoute[]>(() => locationState?.routes || []);
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !locationState?.routes || locationState.routes.length === 0,
  );
  const [hopFilter, setHopFilter] = useState<'all' | 2 | 3 | 4>('all');

  useEffect(() => {
    let isMounted = true;

    const loadRoutes = async () => {
      if (!locationState?.routes || locationState.routes.length === 0) {
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
      } catch (error) {
        console.error('Failed to load routes', error);
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
    haveId,
    wantId,
    objectiveText,
    maxSteps,
    valueTolerancePct,
    locationState?.desiredCategory,
    locationState?.routes,
    searchRoutesReal,
  ]);

  const filteredRoutes =
    hopFilter === 'all' ? routes : routes.filter((r) => r.stepsCount === hopFilter);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-surface">
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
    <div className="flex flex-col h-full bg-surface">
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
        {filteredRoutes.length === 0 ? (
          <EmptyState
            iconName="search"
            title={t('routeResults.emptyTitle')}
            description={t('routeResults.emptyDescription')}
            action={
              hopFilter !== 'all' ? (
                <Button variant="primary" onClick={() => setHopFilter('all')}>
                  {t('routeResults.showAll')}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => navigate('/home')}>
                  {t('routeResults.backHome')}
                </Button>
              )
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
                      <div className="flex items-center gap-1.5 text-primary">
                        <Icon name="auto_awesome" size="xs" filled />
                        <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                          {t('routeResults.aiVerified', { percent: matchPct })}
                        </span>
                      </div>
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
                          <span className="font-label-sm text-[10px] text-primary font-bold">
                            ${item.estimatedValue ?? 450}
                          </span>
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
