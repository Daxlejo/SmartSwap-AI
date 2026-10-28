import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { useApp } from '@/context/AppContext';
import { mockSwapRoute } from '@/data/mockData';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

export const ProposalConfirmScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { proposeRouteReal } = useApp();
  const route = (location.state?.route as SwapRoute | undefined) ?? mockSwapRoute;

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First item in chain (offered by current user: item-bike / Bicicleta Trek)
  const offeredItem = route.chainItems[0] || mockSwapRoute.chainItems[0];
  // Last item in chain (desired by current user: item-camera / Cámara Fujifilm)
  const targetItem =
    route.chainItems[route.chainItems.length - 1] ||
    mockSwapRoute.chainItems[mockSwapRoute.chainItems.length - 1];
  // Second participant in the chain (recipient of the user's item)
  const recipientUser = route.participants[1] || route.participants[0];
  const recipientDisplayName = recipientUser?.name ?? '';

  const handleSendProposal = async () => {
    if (!acceptedTerms || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const proposedRoute = await proposeRouteReal(route);
      navigate('/swap/proposal/sent', { state: { route: proposedRoute } });
    } catch {
      navigate('/swap/proposal/sent', { state: { route } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-surface px-margin pt-4 pb-8 space-y-5">
      {/* Screen Header */}
      <div className="flex flex-col space-y-1">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
          {t('proposalConfirm.title')}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t('proposalConfirm.subtitle')}
        </p>
      </div>

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
            <img
              src={offeredItem.imageUrl}
              alt={offeredItem.name}
              className="w-16 h-16 rounded-xl object-cover bg-surface-container-low border border-surface-container-high/60 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                {offeredItem.name}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant truncate">
                {t(`catalog.conditions.${offeredItem.condition}`, { defaultValue: offeredItem.condition })}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md text-primary font-bold">
                  {t('proposalConfirm.estimatedValue', { value: offeredItem.estimatedValue ?? 780 })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Divider with sync icon in center */}
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full border-t border-surface-container-high/60" />
          <div className="absolute flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low border border-surface-container-high/60 shadow-xs">
            <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center">
              <Icon name="sync_alt" size="xs" />
            </div>
            <span className="font-label-sm text-label-sm text-on-surface font-bold whitespace-nowrap">
              {t('proposalConfirm.smartSwap', { kg: route.co2SavedKg })}
            </span>
          </div>
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
            <img
              src={targetItem.imageUrl}
              alt={targetItem.name}
              className="w-16 h-16 rounded-xl object-cover bg-surface-container-low border border-surface-container-high/60 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                {targetItem.name}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant truncate">
                {t(`catalog.conditions.${targetItem.condition}`, { defaultValue: targetItem.condition })}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md text-primary font-bold">
                  {t('proposalConfirm.estimatedValue', { value: targetItem.estimatedValue ?? 790 })}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* AI Explanation Summary if present */}
      {route.aiExplanation && (
        <section
          aria-label={t('proposalConfirm.fairnessAria')}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-primary">
            <Icon name="auto_awesome" size="xs" filled />
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
              {t('proposalConfirm.aiVerified')}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
            {route.aiExplanation}
          </p>
        </section>
      )}

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
            <Badge
              variant="tertiary-subtle"
              className="text-tertiary bg-tertiary-fixed"
              icon="verified_user"
            >
              {t('proposalConfirm.stepOf', { count: route.stepsCount })}
            </Badge>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <Avatar
              src={recipientUser.avatarUrl}
              alt={recipientDisplayName}
              size="lg"
              verified={recipientUser.verified}
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                  {recipientDisplayName}
                </span>
                <span className="inline-flex items-center gap-0.5 font-label-md text-label-md text-on-surface font-bold">
                  <Icon name="star" size="xs" filled className="text-secondary-container" />
                  {recipientUser.rating.toFixed(1)}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 truncate">
                <Icon name="location_on" size="xs" className="text-primary shrink-0" />
                <span className="truncate">{recipientUser.location}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Terms Checkbox */}
      <label
        htmlFor="custody-terms"
        className="flex items-start gap-3 p-3.5 rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest shadow-sm cursor-pointer select-none"
      >
        <input
          id="custody-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
        />
        <span className="font-body-md text-body-md text-on-surface-variant leading-snug">
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
