import type { Item, User } from '@/types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';

export interface ObjectCardProps {
  item: Item;
  owner?: User;
  onOfferSwap?: (item: Item) => void;
  className?: string;
}

export const ObjectCard = ({
  item,
  owner,
  onOfferSwap,
  className,
}: ObjectCardProps) => {
  const { t } = useTranslation();
  const hasDistance = item.distanceKm !== null && item.distanceKm !== undefined;
  return (
    <article
      className={`flex flex-col rounded-2xl bg-surface-container-lowest p-3.5 shadow-sm space-y-3 hover:shadow-md transition-shadow border border-surface-container-high/60 ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Item image with category badge */}
        <div className="relative w-24 h-24 rounded-xl bg-surface-container-high overflow-hidden shrink-0">
          <ItemImage src={item.imageUrl} alt={item.name} category={item.category} className="w-full h-full" />
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-surface/90 backdrop-blur-sm font-label-sm text-[10px] text-primary font-bold">
            {t(`catalog.categories.${item.category}`, { defaultValue: item.category })}
          </span>
        </div>

        {/* Item details */}
        <div className="flex flex-col flex-1 min-w-0 justify-between h-24">
          <div>
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-headline-sm text-[15px] font-bold text-on-surface truncate">
                {item.name}
              </h3>
              <Badge variant="surface" className="text-[10px] py-0 shrink-0">
                {t(`catalog.conditions.${item.condition}`, { defaultValue: item.condition })}
              </Badge>
            </div>

            {(owner || hasDistance) && (
              <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-0.5 min-w-0">
                  <Icon name="location_on" size="xs" />
                  <span className="truncate">
                    {!hasDistance
                      ? owner?.location
                      : (item.distanceKm as number) < 1
                        ? t('location.distance.sameMunicipality')
                        : t('location.distance.km', { km: Math.round(item.distanceKm as number) })}
                  </span>
                </span>
                {owner && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-on-surface truncate">
                      {owner.name} (★ {owner.rating})
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Wants preview */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-low">
            <Icon name="swap_horizontal_circle" size="xs" className="text-secondary shrink-0" />
            <span className="font-label-sm text-[11px] text-on-surface truncate">
              {item.description || t('cards.openToCircularOffers')}
            </span>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-container-low">
        <div className="flex items-center gap-1 text-primary">
          <Icon name="verified_user" size="xs" />
          <span className="font-label-sm text-label-sm font-semibold">
            {t('cards.verifiedSwap')}
          </span>
        </div>
        <Button
          size="sm"
          variant="primary"
          rightIcon="send"
          onClick={() => onOfferSwap?.(item)}
        >
          {t('cards.propose')}
        </Button>
      </div>
    </article>
  );
};
