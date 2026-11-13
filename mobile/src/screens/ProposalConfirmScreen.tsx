import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';
import { ApiError } from '@/services/http/apiClient';
import { ItemImage } from '@/components/ui/ItemImage';

interface ProposalConfirmContentProps {
  route: SwapRoute;
}

const ProposalConfirmContent: React.FC<ProposalConfirmContentProps> = ({ route }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { proposeRouteReal } = useApp();

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const offeredItem = route.chainItems[0];
  const targetItem = route.chainItems[route.chainItems.length - 1];
  // Second participant in the chain (recipient of the user's item)
  const recipientUser = route.participants[1] || route.participants[0];
  const recipientDisplayName = recipientUser?.name ?? '';

  const handleSendProposal = async () => {
    if (!acceptedTerms || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const proposedRoute = await proposeRouteReal(route);
      navigate('/swap/proposal/sent', { state: { route: proposedRoute } });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError && error.message
          ? error.message
          : t('proposalConfirm.sendFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-surface px-margin pt-4 space-y-5">
      <p className="font-body-md text-body-md text-on-surface-variant">
        {t('proposalConfirm.subtitle')}
      </p>

      {/* Exchange Cards Container */}
      <div className="flex flex-col space-y-3">
        {/* Section: Yo ofrezco */}
        <section
          aria-label={t('proposalConfirm.iOffer')}
          className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t('proposalConfirm.iOffer')}
            </h2>
            <Badge variant="surface" icon="upload">
              {t('proposalConfirm.yourItem')}
            </Badge>
          </div>

          <div className="flex items-center gap-3.5">
            <ItemImage
              src={offeredItem.imageUrl}
              alt={offeredItem.name}
              category={offeredItem.category}
              className="w-16 h-16 rounded-xl bg-surface-container-low border border-surface-container-high/60 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold line-clamp-2 break-words">
                {offeredItem.name}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 break-words">
                {t(`catalog.conditions.${offeredItem.condition}`, {
                  defaultValue: offeredItem.condition,
                })}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md text-primary font-bold">
                  {offeredItem.estimatedValue !== undefined &&
                    t('proposalConfirm.estimatedValue', {
                      value: formatCop(offeredItem.estimatedValue),
                    })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="flex justify-center text-primary">
          <Icon name="swap_vert" size="lg" />
        </div>

        {/* Section: Quiero recibir */}
        <section
          aria-label={t('proposalConfirm.iWant')}
          className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t('proposalConfirm.iWant')}
            </h2>
            <Badge variant="primary-subtle" icon="download">
              {t('proposalConfirm.finalTarget')}
            </Badge>
          </div>

          <div className="flex items-center gap-3.5">
            <ItemImage
              src={targetItem.imageUrl}
              alt={targetItem.name}
              category={targetItem.category}
              className="w-16 h-16 rounded-xl bg-surface-container-low border border-surface-container-high/60 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold line-clamp-2 break-words">
                {targetItem.name}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 break-words">
                {t(`catalog.conditions.${targetItem.condition}`, {
                  defaultValue: targetItem.condition,
                })}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md text-primary font-bold">
                  {targetItem.estimatedValue !== undefined &&
                    t('proposalConfirm.estimatedValue', {
                      value: formatCop(targetItem.estimatedValue),
                    })}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recipient Info Card */}
      {recipientUser && (
        <section
          aria-label={t('proposalConfirm.recipientAria')}
          className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t('proposalConfirm.goesTo', { name: recipientDisplayName })}
            </h2>
            <Badge variant="tertiary-subtle">
              {t('proposalConfirm.stepOf', { count: route.stepsCount })}
            </Badge>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <Avatar src={recipientUser.avatarUrl} alt={recipientDisplayName} size="lg" />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold line-clamp-2 break-words">
                  {recipientDisplayName}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 line-clamp-2 break-words">
                <Icon name="location_on" size="xs" className="text-primary shrink-0" />
                <span className="line-clamp-2 break-words">{recipientUser.location}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {submitError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-error-container/40 text-on-error-container font-body-sm text-body-sm"
        >
          {submitError}
        </div>
      )}

      {/* The proposal locks the user's item until everyone answers: say so plainly */}
      <label
        htmlFor="custody-terms"
        className="flex items-start gap-3 min-h-12 p-3.5 rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-sm cursor-pointer select-none"
      >
        <input
          id="custody-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden="true"
          className={`mt-0.5 w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
            acceptedTerms ? 'bg-primary border-primary text-on-primary' : 'border-outline'
          }`}
        >
          {acceptedTerms && <Icon name="check" size="sm" />}
        </span>
        <span className="font-body-md text-body-md text-on-surface">
          {t('proposalConfirm.acceptTerms')}
        </span>
      </label>

      {/* Bottom Action Buttons */}
      <div className="mt-auto pt-2 flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          disabled={isSubmitting}
          onClick={() => navigate(-1)}
        >
          {t('proposalConfirm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!acceptedTerms || isSubmitting}
          rightIcon="send"
          onClick={handleSendProposal}
        >
          {isSubmitting ? t('proposalConfirm.sending') : t('proposalConfirm.send')}
        </Button>
      </div>
    </div>
  );
};

/** The route to confirm travels in the navigation state; without it there is nothing to show. */
export const ProposalConfirmScreen: React.FC = () => {
  const location = useLocation();
  const route = location.state?.route as SwapRoute | undefined;
  if (!route || route.chainItems.length < 2) {
    return <Navigate to="/swap/configure" replace />;
  }
  return <ProposalConfirmContent route={route} />;
};
