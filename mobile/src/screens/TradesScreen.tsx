import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TradeCard } from '@/components/TradeCard';
import type { SwapRoute } from '@/types';
import { ApiError } from '@/services/http/apiClient';
import { formatRelativeTime } from '@/utils/relativeTime';
import { useTranslation } from '@/hooks/useTranslation';
import { ownSide, routePhase, toReceivedProposals, type ReceivedProposal } from '@/utils/routeView';
import { ScreenHeader } from '@/components/ScreenHeader';

type TabType = 'recibidas' | 'enviadas' | 'en_curso';

/** The person a route is "with": who proposed it, or, for the user's own, who gets their item. */
const counterpartOf = (route: SwapRoute, userId: string | undefined) => {
  const proposer = route.participants.find((person) => person.id === route.initiatorId);
  if (proposer && proposer.id !== userId) return proposer;
  const ownStep = route.steps?.find((step) => step.userId === userId);
  return ownStep?.toUser ?? route.participants.find((person) => person.id !== userId) ?? route.participants[0];
};

/** The card's main way in: the route screen with the ring and every step. */
const ViewDetailsButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="md" fullWidth rightIcon="arrow_forward" onClick={onClick}>
      {t('trades.viewDetails')}
    </Button>
  );
};

export const TradesScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();
  const {
    routes,
    loadStates,
    currentUser,
    respondToProposalReal,
    completeSwapReal,
    cancelRouteReal,
    refreshRoutesReal,
  } = useApp();
  // "Your route" can open a given tab (e.g. Received, to answer a proposal)
  const [activeTab, setActiveTab] = useState<TabType>(
    (location.state as { tab?: TabType } | null)?.tab ?? 'recibidas',
  );

  // Recibidas state
  const [receivedProposals, setReceivedProposals] = useState<ReceivedProposal[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  // En Curso state
  const [completedRouteIds, setCompletedRouteIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void refreshRoutesReal();
  }, [refreshRoutesReal]);

  // Recibidas: routes started by other users
  useEffect(() => {
    const apiProposals = toReceivedProposals(routes, currentUser?.id);

    setReceivedProposals(apiProposals);
  }, [routes, currentUser?.id]);

  const describeError = (error: unknown): string =>
    error instanceof ApiError && error.message ? error.message : t('trades.actionFailed');

  const handleRespond = async (id: string, decision: 'ACCEPTED' | 'REJECTED') => {
    const previous = receivedProposals.find((p) => p.id === id)?.status ?? 'pending';
    const optimistic = decision === 'ACCEPTED' ? 'accepted' : 'declined';
    setActionError(null);
    setProcessingId(id);
    setReceivedProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: optimistic } : p)),
    );
    try {
      await respondToProposalReal(id, decision);
    } catch (error) {
      setReceivedProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: previous } : p)),
      );
      setActionError(describeError(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptProposal = (id: string) => handleRespond(id, 'ACCEPTED');
  const handleDeclineProposal = (id: string) => handleRespond(id, 'REJECTED');

  const inProgressRoutes = routes.filter((r) => {
    const phase = routePhase(r.status);
    return phase !== 'cancelled' && phase !== 'expired';
  });

  // Enviadas: real proposals the current user initiated
  const sentRoutes = routes.filter((r) => r.initiatorId === currentUser?.id);

  const handleCancelSentRoute = async (routeId: string) => {
    setActionError(null);
    setProcessingId(routeId);
    try {
      await cancelRouteReal(routeId);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    setActionError(null);
    setProcessingId(routeId);
    setCompletedRouteIds((prev) => ({ ...prev, [routeId]: true }));
    try {
      await completeSwapReal(routeId);
    } catch (error) {
      setCompletedRouteIds((prev) => ({ ...prev, [routeId]: false }));
      setActionError(describeError(error));
    } finally {
      setProcessingId(null);
    }
  };

  // `from: 'trades'` lets "Your route" go back here instead of opening Trades again
  const openRoute = (route: SwapRoute) =>
    navigate(`/swap/route/${route.id}`, { state: { route, from: 'trades' } });

  const showTabs = routes.length > 0 || loadStates.routes === 'ready';

  return (
    <div className="flex flex-col flex-1 bg-surface px-margin pt-4 space-y-4">
      <ScreenHeader title={t('headers.swaps.title')} />
      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t('trades.tabsAria')}
        className="flex p-1 rounded-2xl bg-surface-container-low border border-surface-container-high gap-1 select-none"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'recibidas'}
          onClick={() => setActiveTab('recibidas')}
          className={`flex-1 min-h-11 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 min-w-0 ${
            activeTab === 'recibidas'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="break-words">{t('trades.tabs.received')}</span>
          <span
            className={`min-w-[1.5rem] px-1.5 rounded-full text-caption font-bold ${
              activeTab === 'recibidas'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {receivedProposals.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'enviadas'}
          onClick={() => setActiveTab('enviadas')}
          className={`flex-1 min-h-11 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 min-w-0 ${
            activeTab === 'enviadas'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="break-words">{t('trades.tabs.sent')}</span>
          <span
            className={`min-w-[1.5rem] px-1.5 rounded-full text-caption font-bold ${
              activeTab === 'enviadas'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {sentRoutes.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'en_curso'}
          onClick={() => setActiveTab('en_curso')}
          className={`flex-1 min-h-11 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 min-w-0 ${
            activeTab === 'en_curso'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="break-words">{t('trades.tabs.inProgress')}</span>
          <span
            className={`min-w-[1.5rem] px-1.5 rounded-full text-caption font-bold ${
              activeTab === 'en_curso'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {inProgressRoutes.length}
          </span>
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 p-3 rounded-xl bg-error-container/40 text-on-error-container font-body-sm text-body-sm"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label={t('trades.dismissError')}
            className="shrink-0 w-11 h-11 -m-2 flex items-center justify-center rounded-full"
          >
            <Icon name="close" size="xs" />
          </button>
        </div>
      )}

      {loadStates.routes === 'error' && routes.length === 0 && (
        <ErrorState onRetry={() => void refreshRoutesReal()} />
      )}

      {loadStates.routes === 'loading' && routes.length === 0 && (
        <div className="flex flex-col gap-3.5" aria-busy="true">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      )}

      {/* Tab: Recibidas */}
      {showTabs && activeTab === 'recibidas' && (
        <div className="flex flex-col gap-3.5">
          {receivedProposals.length === 0 && (
            <EmptyState
              illustration="inbox"
              title={t('states.tradesReceived')}
              action={
                <Button variant="primary" size="md" onClick={() => navigate('/explore')}>
                  {t('states.tradesReceivedCta')}
                </Button>
              }
            />
          )}
          {receivedProposals.map((proposal) => {
            const isAccepted = proposal.status === 'accepted';
            const isDeclined = proposal.status === 'declined';
            const isBusy = processingId === proposal.id;
            const route = routes.find((r) => r.id === proposal.id);

            return (
              <TradeCard
                key={proposal.id}
                id={proposal.id}
                person={{ name: proposal.senderName, avatarUrl: proposal.senderAvatar }}
                meta={route?.code}
                status={
                  isAccepted
                    ? { variant: 'success', label: t('trades.status.accepted') }
                    : isDeclined
                      ? { variant: 'error', label: t('trades.status.declined') }
                      : { variant: 'secondary-subtle', label: t('trades.status.pending') }
                }
                offered={{
                  name: proposal.offeredItemName,
                  imageUrl: proposal.offeredItemImg,
                  category: proposal.offeredItemCategory,
                }}
                received={{
                  name: proposal.targetItemName,
                  imageUrl: proposal.targetItemImg,
                  category: proposal.targetItemCategory,
                }}
                note={
                  isAccepted ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                      <Icon name="check_circle" size="sm" filled />
                      <span className="font-label-md text-label-md font-bold">
                        {t('trades.acceptedMessage')}
                      </span>
                    </div>
                  ) : isDeclined ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container text-on-surface-variant font-body-sm text-body-sm">
                      <Icon name="cancel" size="sm" />
                      <span>{t('trades.declinedMessage')}</span>
                    </div>
                  ) : null
                }
              >
                {!isAccepted && !isDeclined && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      disabled={isBusy}
                      onClick={() => handleDeclineProposal(proposal.id)}
                    >
                      {t('trades.decline')}
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      disabled={isBusy}
                      onClick={() => handleAcceptProposal(proposal.id)}
                    >
                      {t('trades.accept')}
                    </Button>
                  </div>
                )}
                {route && <ViewDetailsButton onClick={() => openRoute(route)} />}
              </TradeCard>
            );
          })}
        </div>
      )}

      {/* Tab: Enviadas */}
      {showTabs && activeTab === 'enviadas' && (
        <div className="flex flex-col gap-3.5">
          {sentRoutes.length === 0 ? (
            <EmptyState
              illustration="sent"
              title={t('states.tradesSent')}
              action={
                <Button variant="primary" size="md" onClick={() => navigate('/swap/configure')}>
                  {t('states.tradesSentCta')}
                </Button>
              }
            />
          ) : (
            sentRoutes.map((route) => {
              const recipient = counterpartOf(route, currentUser?.id);
              const { offered, received } = ownSide(route, currentUser?.id);
              const phase = routePhase(route.status);
              const isPending = phase === 'pending';
              const isBusy = processingId === route.id;
              const meta = [
                route.code,
                route.createdAt
                  ? t('trades.sentAt', { time: formatRelativeTime(route.createdAt, language) })
                  : undefined,
              ]
                .filter(Boolean)
                .join(' • ');

              return (
                <TradeCard
                  key={route.id}
                  id={route.id}
                  person={{
                    name: recipient?.name ?? '—',
                    avatarUrl: recipient?.avatarUrl,
                    verified: recipient?.verified,
                  }}
                  meta={meta}
                  status={
                    isPending
                      ? { variant: 'warning', label: t('trades.inReview') }
                      : phase === 'confirmed' || phase === 'completed'
                        ? { variant: 'success', label: t('trades.status.accepted') }
                        : phase === 'expired'
                          ? { variant: 'surface', label: t('trades.expired') }
                          : { variant: 'error', label: t('trades.cancelledTitle') }
                  }
                  offered={offered}
                  received={received}
                >
                  <ViewDetailsButton onClick={() => openRoute(route)} />
                  {isPending && (
                    <Button
                      variant="ghost"
                      size="md"
                      fullWidth
                      disabled={isBusy}
                      onClick={() => handleCancelSentRoute(route.id)}
                      className="text-error hover:bg-error-container/20"
                    >
                      {isBusy ? t('trades.cancelling') : t('trades.cancelProposal')}
                    </Button>
                  )}
                </TradeCard>
              );
            })
          )}
        </div>
      )}

      {/* Tab: En Curso */}
      {showTabs && activeTab === 'en_curso' && (
        <div className="flex flex-col gap-3.5">
          {inProgressRoutes.length === 0 ? (
            <EmptyState
              illustration="routes"
              title={t('states.tradesInProgress')}
              action={
                <Button variant="primary" size="md" onClick={() => navigate('/swap/configure')}>
                  {t('states.tradesInProgressCta')}
                </Button>
              }
            />
          ) : (
            inProgressRoutes.map((route) => {
              const person = counterpartOf(route, currentUser?.id);
              const { offered, received } = ownSide(route, currentUser?.id);
              const isCompleted =
                Boolean(completedRouteIds[route.id]) || routePhase(route.status) === 'completed';
              const total = route.stepsCount;
              const accepted = (route.steps ?? []).filter((s) => s.acceptance === 'ACCEPTED').length;
              const progress = isCompleted
                ? t('trades.circuitCompleted', { count: total })
                : t('trades.stepProgress', { done: accepted, total });
              const isBusy = processingId === route.id;

              return (
                <TradeCard
                  key={route.id}
                  id={route.id}
                  person={{
                    name: person?.name ?? '—',
                    avatarUrl: person?.avatarUrl,
                    verified: person?.verified,
                  }}
                  meta={[route.code, progress].filter(Boolean).join(' • ')}
                  status={
                    isCompleted
                      ? { variant: 'success', label: t('trades.completed') }
                      : { variant: 'primary-subtle', label: t('trades.active') }
                  }
                  offered={offered}
                  received={received}
                >
                  <ViewDetailsButton onClick={() => openRoute(route)} />
                  {!isCompleted && (
                    <Button
                      variant="ghost"
                      size="md"
                      fullWidth
                      leftIcon="check_circle"
                      disabled={isBusy}
                      onClick={() => handleCompleteRoute(route.id)}
                    >
                      {isBusy ? t('trades.completing') : t('trades.completeSwap')}
                    </Button>
                  )}
                </TradeCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
