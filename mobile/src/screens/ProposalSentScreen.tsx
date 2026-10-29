import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { mockSwapRoute } from '@/data/mockData';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';

export const ProposalSentScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const route = (location.state?.route as SwapRoute | undefined) ?? mockSwapRoute;

  const [animateCheck, setAnimateCheck] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimateCheck(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // Build 4-step chain summary items
  const fourStepItems =
    route.chainItems.length >= 5
      ? [route.chainItems[0], route.chainItems[1], route.chainItems[2], route.chainItems[4]]
      : route.chainItems.slice(0, 4);

  return (
    <div className="flex flex-col items-center justify-between min-h-full bg-surface px-margin pt-8 pb-8 text-center space-y-6">
      {/* Top Celebration & Title */}
      <div className="flex flex-col items-center space-y-4 w-full">
        {/* Large Checkmark Circle in Primary Color with Scale-in Animation */}
        <div
          className={`w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg ring-8 ring-primary-fixed/50 transition-transform duration-500 ease-out ${
            animateCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <Icon name="check" size="xl" />
        </div>

        <div className="space-y-1.5 max-w-xs">
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {t('proposalSent.title')}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('proposalSent.description', { count: Math.max(1, route.participants.length - 1) })}
          </p>
        </div>
      </div>

      {/* Route Summary Card showing the 4-step chain */}
      <section
        aria-label={t('proposalSent.summaryAria', { count: route.stepsCount })}
        className="w-full rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-4 text-left space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            {t('proposalSent.summaryTitle')}
          </h2>
          <Badge variant="primary-subtle" icon="sync_alt">
            {t('proposalSent.steps', { count: route.stepsCount })}
          </Badge>
        </div>

        {/* 4-Step Visual Chain */}
        <div className="flex items-center justify-between gap-1 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 overflow-x-auto">
          {fourStepItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === fourStepItems.length - 1;

            return (
              <div key={item.id} className="flex items-center shrink-0">
                <div className="flex flex-col items-center min-w-[56px]">
                  <div
                    className={`relative w-12 h-12 rounded-xl bg-surface-container-highest overflow-hidden shadow-xs flex items-center justify-center ${
                      isLast ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                  >
                    <ItemImage src={item.imageUrl} alt={item.name} category={item.category} className="w-full h-full" />
                    {isFirst && (
                      <span className="absolute bottom-0 right-0 px-1 bg-primary text-on-primary rounded-tl-md font-label-sm text-[8px] font-bold">
                        {t('proposalSent.you')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-label-sm text-label-sm mt-1 truncate max-w-[64px] ${
                      isLast ? 'text-primary font-bold' : 'text-on-surface'
                    }`}
                  >
                    {item.name.split(' ')[0]}
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

        <div className="flex items-center justify-between pt-0.5">
          <span className="font-body-md text-body-md text-on-surface-variant">
            {t('proposalSent.estimatedImpact')}
          </span>
          <span className="font-label-md text-label-md font-bold text-[#1a7a4a] flex items-center gap-1">
            <Icon name="eco" size="xs" filled />
            {t('proposalSent.co2Saved', { kg: route.co2SavedKg })}
          </span>
        </div>
      </section>

      {/* Bottom Navigation Actions */}
      <div className="w-full flex flex-col gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon="sync_alt"
          onClick={() => navigate('/swaps')}
        >
          {t('proposalSent.viewSwaps')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          leftIcon="home"
          onClick={() => navigate('/home')}
        >
          {t('proposalSent.backHome')}
        </Button>
      </div>
    </div>
  );
};
