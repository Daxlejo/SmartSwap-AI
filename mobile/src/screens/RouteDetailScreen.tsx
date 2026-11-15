import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { SwapRoute, Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { routesService } from '@/services/routes/routes.service';
import { ErrorState } from '@/components/ui/ErrorState';
import { RouteStep } from '@/components/RouteStep';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { canProposeRoute, isSignedInUser } from '@/utils/routeView';
import { formatCop } from '@/utils/currency';
import { ItemImage } from '@/components/ui/ItemImage';
import { SwapRing } from '@/components/SwapRing';
import { firstName, toRingParticipants } from '@/utils/swapRing';

export const RouteDetailScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { routeId: routeIdParam } = useParams<{ routeId: string }>();
  const { routes, currentUser } = useApp();

  const knownRoute =
    (location.state?.route as SwapRoute | undefined) ??
    routes.find((r) => r.id === routeIdParam || r.code === routeIdParam);

  const [fetchedRoute, setFetchedRoute] = useState<SwapRoute | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const route = fetchedRoute ?? knownRoute ?? null;
  const ring = useMemo(() => toRingParticipants(route?.steps ?? []), [route]);

  useEffect(() => {
    if (location.state?.route || !routeIdParam) {
      return;
    }
    let isMounted = true;
    setLoadFailed(false);
    setFetchedRoute(null);
    routesService
      .getRouteById(routeIdParam)
      .then((fetched) => {
        if (isMounted) setFetchedRoute(fetched);
      })
      .catch(() => {
        if (isMounted) setLoadFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, [routeIdParam, location.state, reloadKey]);

  if (!route && !routeIdParam) {
    return <Navigate to="/swaps" replace />;
  }

  if (!route) {
    return (
      <div className="px-margin py-6">
        {loadFailed ? (
          <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
        ) : (
          <div
            className="h-48 rounded-2xl bg-surface-container-low animate-pulse"
            aria-busy="true"
          />
        )}
      </div>
    );
  }

  const handlePropose = () => {
    navigate('/swap/proposal/confirm', { state: { route } });
  };

  const aiExplanationText =
    route.aiExplanation || t('routeDetail.fallbackExplanation', { count: route.stepsCount });
  const canPropose = canProposeRoute(route);

  return (
    <div className="flex flex-col flex-1 bg-surface px-margin pt-4 gap-5">
      {ring ? (
        <>
          {/* The ring replaces the text explanation; its list says who gives what */}
          <SwapRing
            participants={ring}
            currentUserId={currentUser?.id}
            variant="full"
            onFindAnotherRoute={() => navigate('/swap/configure')}
          />
          <section aria-label={t('routeDetail.valuesTitle')} className="flex flex-col gap-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t('routeDetail.valuesTitle')}
            </h2>
            <ul className="flex flex-col gap-2">
              {(route.steps ?? []).map((step) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(step.givesItem)}
                    className="w-full min-h-[64px] flex items-center gap-3 p-2 rounded-xl bg-surface-container-lowest border border-surface-container-high text-left hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ItemImage
                      src={step.givesItem.imageUrl}
                      alt=""
                      category={step.givesItem.category}
                      className="w-12 h-12 rounded-lg shrink-0"
                    />
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="font-label-lg text-label-lg text-on-surface break-words">
                        {step.givesItem.name}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('routeDetail.valueLine', {
                          name: isSignedInUser(step.userId, currentUser?.id)
                            ? t('routeDetail.you')
                            : firstName(step.user.name),
                          value:
                            step.givesItem.estimatedValue !== undefined
                              ? formatCop(step.givesItem.estimatedValue)
                              : t('routeDetail.noValue'),
                        })}
                      </span>
                    </span>
                    <Icon
                      name="chevron_right"
                      size="md"
                      className="text-on-surface-variant shrink-0"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <section aria-label={t('routeDetail.aiAria')} className="flex flex-col gap-1">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              {t('routeDetail.people', { count: route.participants.length || route.stepsCount })}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{aiExplanationText}</p>
          </section>

          <ol className="flex flex-col" aria-label={t('routeDetail.stepsAria')}>
            {route.chainItems.map((item, index) => {
              const fromUser = route.participants[index] || route.participants[0];
              const toUser = route.participants[(index + 1) % route.participants.length];
              return (
                <RouteStep
                  key={`${item.id}-${index}`}
                  fromUser={fromUser}
                  toUser={toUser}
                  itemGiven={item}
                  isYou={isSignedInUser(fromUser?.id, currentUser?.id)}
                  acceptance={route.steps?.[index]?.acceptance}
                  onItemClick={(i) => setSelectedItem(i)}
                />
              );
            })}
          </ol>
        </>
      )}

      {canPropose ? (
        <Button variant="primary" size="lg" fullWidth onClick={handlePropose}>
          {t('routeDetail.propose')}
        </Button>
      ) : (
        // A saved route is answered or completed from Trades, not proposed again
        <Button
          variant="outline"
          size="lg"
          fullWidth
          rightIcon="arrow_forward"
          onClick={() => navigate('/swaps')}
        >
          {t('routeDetail.openTrades')}
        </Button>
      )}

      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name}
      >
        {selectedItem && (
          <div className="flex flex-col gap-4">
            <ItemImage
              src={selectedItem.imageUrl}
              alt={selectedItem.name}
              category={selectedItem.category}
              className="w-full h-48 rounded-xl"
            />
            <p className="font-body-md text-body-md text-on-surface-variant">
              {[
                t(`catalog.categories.${selectedItem.category}`, {
                  defaultValue: selectedItem.category,
                }),
                t(`catalog.conditions.${selectedItem.condition}`, {
                  defaultValue: selectedItem.condition,
                }),
                selectedItem.estimatedValue !== undefined
                  ? formatCop(selectedItem.estimatedValue)
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {selectedItem.description && (
              <p className="font-body-md text-body-md text-on-surface">
                {selectedItem.description}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
