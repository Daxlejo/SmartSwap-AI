import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { mockSwapRoute } from '@/data/mockData';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/services/http/apiClient';
import { formatRelativeTime } from '@/utils/relativeTime';

// Mock avatars
import { ItemImage } from '@/components/ui/ItemImage';
import { useTranslation } from '@/hooks/useTranslation';

type TabType = 'recibidas' | 'enviadas' | 'en_curso';

interface ReceivedProposal {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderRating: number;
  senderVerified: boolean;
  offeredItemName: string;
  offeredItemImg?: string;
  offeredItemCategory?: string;
  targetItemName: string;
  targetItemImg?: string;
  targetItemCategory?: string;
  timeAgo: string;
  status: 'pending' | 'accepted' | 'declined';
}

export const TradesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const {
    routes,
    currentUser,
    respondToProposalReal,
    completeSwapReal,
    cancelRouteReal,
    refreshRoutesReal,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('recibidas');

  // Recibidas state
  const [receivedProposals, setReceivedProposals] = useState<ReceivedProposal[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  // En Curso state
  const [completedRouteIds, setCompletedRouteIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    refreshRoutesReal().catch(() => {});
  }, [refreshRoutesReal]);

  // Synchronize any real backend routes where user is a participant into Recibidas
  useEffect(() => {
    const apiProposals: ReceivedProposal[] = routes
      .filter((r) => r.id !== mockSwapRoute.id && r.initiatorId !== currentUser?.id)
      .map((r) => {
        const initiator = r.participants[0];
        const offered = r.chainItems[0];
        const target = r.chainItems[r.chainItems.length - 1];
        const upperStatus = (r.status || 'ACTIVE').toUpperCase();
        const userStep = r.steps?.find((s) => s.userId === currentUser?.id);

        let status: 'pending' | 'accepted' | 'declined' = 'pending';
        if (
          upperStatus === 'CONFIRMED' ||
          upperStatus === 'COMPLETED' ||
          userStep?.acceptance === 'ACCEPTED'
        ) {
          status = 'accepted';
        } else if (upperStatus === 'CANCELLED' || userStep?.acceptance === 'DECLINED') {
          status = 'declined';
        }

        return {
          id: r.id,
          senderName: initiator?.name || '—',
          senderAvatar: initiator?.avatarUrl,
          senderRating: initiator?.rating ?? 0,
          senderVerified: initiator?.verified ?? false,
          offeredItemName: offered?.name ?? '',
          offeredItemImg: offered?.imageUrl,
          offeredItemCategory: offered?.category,
          targetItemName: target?.name ?? '',
          targetItemImg: target?.imageUrl,
          targetItemCategory: target?.category,
          timeAgo: t('trades.justReceived'),
          status,
        };
      });

    setReceivedProposals(apiProposals);
  }, [routes, currentUser?.id, t]);

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

  const primaryActiveRoute = routes[0] || mockSwapRoute;

  // Enviadas: real proposals the current user initiated
  const sentRoutes = routes.filter(
    (r) => r.id !== mockSwapRoute.id && r.initiatorId === currentUser?.id,
  );

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

  const chainSteps =
    primaryActiveRoute && primaryActiveRoute.chainItems.length >= 2
      ? primaryActiveRoute.chainItems.slice(0, 4).map((item, idx) => ({
          name: item.name.split(' ')[0],
          img: item.imageUrl,
          category: item.category,
          user:
            idx === 0
              ? t('trades.you')
              : primaryActiveRoute.participants[idx]?.name || t('trades.step', { count: idx + 1 }),
        }))
      : [];

  const isPrimaryRouteCompleted =
    Boolean(completedRouteIds[primaryActiveRoute.id]) ||
    (primaryActiveRoute.status || '').toUpperCase() === 'COMPLETED';

  const acceptedStepsCount =
    primaryActiveRoute.steps && primaryActiveRoute.steps.length > 0
      ? primaryActiveRoute.steps.filter((s) => s.acceptance === 'ACCEPTED').length || 1
      : 1;
  const totalStepsCount = primaryActiveRoute.stepsCount || 4;
  const progressPct = isPrimaryRouteCompleted
    ? 100
    : Math.min(100, Math.max(25, Math.round((acceptedStepsCount / totalStepsCount) * 100)));

  return (
    <div className="flex flex-col min-h-full bg-surface px-margin pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
          {t('trades.title')}
        </h1>
        <Badge variant="primary-subtle" icon="verified_user">
          {t('trades.safeMode')}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-surface-container-low border border-surface-container-high/60 gap-1 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('recibidas')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'recibidas'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>{t('trades.tabs.received')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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
          onClick={() => setActiveTab('enviadas')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'enviadas'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>{t('trades.tabs.sent')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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
          onClick={() => setActiveTab('en_curso')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'en_curso'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>{t('trades.tabs.inProgress')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'en_curso'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {routes.length || 1}
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
            className="shrink-0"
          >
            <Icon name="close" size="xs" />
          </button>
        </div>
      )}

      {/* Tab: Recibidas */}
      {activeTab === 'recibidas' && (
        <div className="flex flex-col gap-3.5">
          {receivedProposals.map((proposal) => {
            const isAccepted = proposal.status === 'accepted';
            const isDeclined = proposal.status === 'declined';
            const isBusy = processingId === proposal.id;

            return (
              <div
                key={proposal.id}
                className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3"
              >
                {/* Header: Sender + Rating + Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={proposal.senderAvatar}
                      alt={proposal.senderName}
                      size="md"
                      verified={proposal.senderVerified}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-[14px] font-bold text-on-surface truncate">
                          {proposal.senderName}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-label-sm text-[11px] text-on-surface font-semibold">
                          <Icon name="star" size="xs" filled className="text-secondary" />
                          {proposal.senderRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">
                        {proposal.timeAgo}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={isAccepted ? 'success' : isDeclined ? 'error' : 'secondary-subtle'}
                  >
                    {isAccepted
                      ? t('trades.status.accepted')
                      : isDeclined
                        ? t('trades.status.declined')
                        : t('trades.status.pending')}
                  </Badge>
                </div>

                {/* Items exchanged comparison */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                  {/* Offers */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ItemImage src={proposal.offeredItemImg} alt={proposal.offeredItemName} category={proposal.offeredItemCategory} className="w-11 h-11 rounded-lg  bg-surface-container shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wider">
                        {t('trades.offers')}
                      </span>
                      <span className="font-body-sm text-[12px] font-semibold text-on-surface truncate">
                        {proposal.offeredItemName}
                      </span>
                    </div>
                  </div>

                  <Icon name="sync_alt" size="xs" className="text-outline shrink-0" />

                  {/* Wants */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ItemImage src={proposal.targetItemImg} alt={proposal.targetItemName} category={proposal.targetItemCategory} className="w-11 h-11 rounded-lg  bg-surface-container shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[10px] text-primary font-bold uppercase tracking-wider">
                        {t('trades.inExchangeFor')}
                      </span>
                      <span className="font-body-sm text-[12px] font-semibold text-on-surface truncate">
                        {proposal.targetItemName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions or Success/Decline Inline State */}
                {isAccepted ? (
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
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container-low">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDeclineProposal(proposal.id)}
                    >
                      {t('trades.decline')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleAcceptProposal(proposal.id)}
                    >
                      {t('trades.accept')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Enviadas */}
      {activeTab === 'enviadas' && (
        <div className="flex flex-col gap-3.5">
          {sentRoutes.length === 0 ? (
            <EmptyState
              iconName="outbox"
              title={t('trades.sentEmptyTitle')}
              description={t('trades.sentEmptyDescription')}
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/swap/configure')}>
                  {t('trades.findSwap')}
                </Button>
              }
            />
          ) : (
            sentRoutes.map((route) => {
              const recipient = route.participants[1] ?? route.participants[0];
              const offered = route.chainItems[0];
              const target = route.chainItems[route.chainItems.length - 1];
              const upperStatus = (route.status || 'ACTIVE').toUpperCase();
              const isPending = upperStatus === 'ACTIVE' || upperStatus === 'SUGGESTED';
              const isBusy = processingId === route.id;
              const statusBadge = isPending
                ? { variant: 'warning' as const, label: t('trades.inReview') }
                : upperStatus === 'CONFIRMED' || upperStatus === 'COMPLETED'
                  ? { variant: 'success' as const, label: t('trades.status.accepted') }
                  : upperStatus === 'EXPIRED'
                    ? { variant: 'surface' as const, label: t('trades.expired') }
                    : { variant: 'error' as const, label: t('trades.cancelledTitle') };

              return (
                <div
                  key={route.id}
                  className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={recipient?.avatarUrl}
                        alt={recipient?.name ?? ''}
                        size="md"
                        verified={recipient?.verified}
                      />
                      <div className="min-w-0">
                        <h2 className="font-headline-sm text-[15px] font-bold text-on-surface truncate">
                          {t('trades.offerTo', { name: recipient?.name ?? '' })}
                        </h2>
                        <span className="font-body-sm text-[11px] text-on-surface-variant">
                          {route.code ? `${route.code} • ` : ''}
                          {route.createdAt
                            ? t('trades.sentAt', { time: formatRelativeTime(route.createdAt, language) })
                            : t('trades.participants', { count: route.participants.length })}
                        </span>
                      </div>
                    </div>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ItemImage src={offered?.imageUrl} alt={offered?.name ?? ''} category={offered?.category} className="w-12 h-12 rounded-lg  bg-surface-container shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-[10px] text-outline uppercase font-bold">
                          {t('trades.youOffer')}
                        </span>
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                          {offered?.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center px-1 text-primary">
                      <Icon name="arrow_forward" size="sm" />
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ItemImage src={target?.imageUrl} alt={target?.name ?? ''} category={target?.category} className="w-12 h-12 rounded-lg  bg-surface-container shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-[10px] text-outline uppercase font-bold">
                          {t('trades.inExchange')}
                        </span>
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                          {target?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-surface-container-low">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/swap/route/${route.id}`, { state: { route } })}
                    >
                      {t('trades.viewDetails')}
                    </Button>
                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleCancelSentRoute(route.id)}
                        className="text-error hover:bg-error-container/20"
                      >
                        {isBusy ? t('trades.cancelling') : t('trades.cancelProposal')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: En Curso */}
      {activeTab === 'en_curso' && (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-label-sm text-[11px] text-secondary font-bold uppercase tracking-wider">
                  Circuito Multi-Canje {primaryActiveRoute.code || 'SR-8492'}
                </span>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {isPrimaryRouteCompleted
                    ? t('trades.circuitCompleted', { count: totalStepsCount })
                    : t('trades.stepProgress', { done: acceptedStepsCount, total: totalStepsCount })}
                </h2>
              </div>
              <Badge variant={isPrimaryRouteCompleted ? 'success' : 'primary'}>
                {isPrimaryRouteCompleted ? t('trades.completed') : t('trades.active')}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-label-sm text-on-surface-variant font-medium">
                <span>Progreso: {progressPct}%</span>
                <span>
                  {isPrimaryRouteCompleted
                    ? t('trades.deliveryConfirmed')
                    : t('trades.stepsLeft', { count: Math.max(0, totalStepsCount - acceptedStepsCount) })}
                </span>
              </div>
            </div>

            {/* Route chain visual: Bicicleta → Balón → Audífonos → Cámara */}
            <div className="flex flex-col space-y-2 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold">
                  {t('trades.circuitChain')}
                </span>
                <span className="font-label-sm text-[11px] font-bold text-[#1a7a4a]">
                  -{primaryActiveRoute.co2SavedKg ?? 42} kg CO₂
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                {chainSteps.map((step, idx) => {
                  const isLast = idx === chainSteps.length - 1;

                  return (
                    <div key={`${step.name}-${idx}`} className="flex items-center shrink-0">
                      <div className="flex flex-col items-center min-w-[56px]">
                        <div
                          className={`relative w-12 h-12 rounded-xl bg-surface-container-highest overflow-hidden shadow-xs flex items-center justify-center ${
                            idx === 0 ? 'ring-2 ring-primary ring-offset-1' : ''
                          }`}
                        >
                          <ItemImage src={step.img} alt={step.name} category={step.category} className="w-full h-full" />
                          {idx === 0 && (
                            <span className="absolute bottom-0 right-0 px-1 bg-primary text-on-primary rounded-tl-md font-label-sm text-[8px] font-bold">
                              {t('trades.you')}
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-label-sm text-[11px] font-semibold text-center mt-1 truncate max-w-[62px] ${
                            idx === 0 ? 'text-primary font-bold' : 'text-on-surface'
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>

                      {!isLast && (
                        <div className="flex flex-col items-center px-0.5 shrink-0 text-primary">
                          <Icon name="arrow_forward" size="xs" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {primaryActiveRoute.aiExplanation && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-on-surface-variant font-body-sm text-[12px] leading-snug">
                <div className="flex items-center gap-1 text-primary font-label-sm text-[11px] font-bold mb-0.5">
                  <Icon name="auto_awesome" size="xs" filled />
                  <span>{t('trades.aiFairness')}</span>
                </div>
                {primaryActiveRoute.aiExplanation}
              </div>
            )}

            {/* Complete Swap & View Details Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              {!isPrimaryRouteCompleted && (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  leftIcon="check_circle"
                  disabled={processingId === primaryActiveRoute.id}
                  onClick={() => handleCompleteRoute(primaryActiveRoute.id)}
                >
                  {processingId === primaryActiveRoute.id
                    ? t('trades.completing')
                    : t('trades.completeSwap')}
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                fullWidth
                rightIcon="arrow_forward"
                onClick={() =>
                  navigate(`/swap/route/${primaryActiveRoute.id}`, {
                    state: { route: primaryActiveRoute },
                  })
                }
              >
                {t('trades.viewDetails')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Eco Banner */}
      <div className="mt-auto pt-2">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary-container/10 border border-primary/20 text-primary shadow-xs">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0 text-primary">
            <Icon name="eco" size="md" filled />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md font-bold text-on-surface">
              {t('trades.ecoImpact')}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t('trades.co2Saved', { kg: currentUser?.co2SavedKg ?? 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
