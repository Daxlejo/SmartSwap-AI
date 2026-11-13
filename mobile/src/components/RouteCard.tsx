import React from 'react';
import type { SwapRoute } from '@/types';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';

export interface RouteCardProps {
  route: SwapRoute;
  onClick: () => void;
}

/**
 * A route found by the engine: what the user receives, from whom, how many people
 * take part, and one action. The full cycle is shown on the route detail screen.
 */
export const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
  const { t } = useTranslation();
  const targetItem = route.chainItems[route.chainItems.length - 1];
  const giver = route.participants[route.participants.length - 1];
  const people = route.participants.length || route.stepsCount;

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high p-space-md shadow-sm">
      <div className="flex items-center gap-3">
        {targetItem && (
          <ItemImage
            src={targetItem.imageUrl}
            alt={targetItem.name}
            category={targetItem.category}
            className="w-16 h-16 rounded-xl bg-surface-container-high shrink-0"
          />
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{t('cards.receives')}</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 break-words">
            {targetItem?.name}
          </h3>
        </div>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant break-words">
        {giver
          ? t('cards.routeSummary', { name: giver.name, count: people })
          : t('cards.routePeople', { count: people })}
      </p>
      <Button variant="primary" size="md" fullWidth rightIcon="arrow_forward" onClick={onClick}>
        {t('cards.viewRoute')}
      </Button>
    </article>
  );
};
