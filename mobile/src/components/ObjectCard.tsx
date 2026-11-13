import type { Item, User } from '@/types';
import { Button } from './ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';

export interface ObjectCardProps {
  item: Item;
  owner?: User;
  onOfferSwap?: (item: Item) => void;
  className?: string;
}

/** Catalog card: photo, full name (up to two lines), one support line and one action. */
export const ObjectCard = ({ item, owner, onOfferSwap, className }: ObjectCardProps) => {
  const { t } = useTranslation();
  const hasDistance = item.distanceKm !== null && item.distanceKm !== undefined;
  const where = hasDistance
    ? (item.distanceKm as number) < 1
      ? t('location.distance.sameMunicipality')
      : t('location.distance.km', { km: Math.round(item.distanceKm as number) })
    : owner?.location ?? item.location;
  const support = [t(`catalog.conditions.${item.condition}`, { defaultValue: item.condition }), where]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container-high ${className ?? ''}`}
    >
      <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 break-words">{item.name}</h3>
      <div className="flex items-center gap-3">
        <ItemImage
          src={item.imageUrl}
          alt={item.name}
          category={item.category}
          className="w-16 h-16 rounded-xl bg-surface-container-high shrink-0"
        />
        <p className="min-w-0 font-body-sm text-body-sm text-on-surface-variant break-words">{support}</p>
      </div>
      <Button size="md" variant="primary" fullWidth rightIcon="send" onClick={() => onOfferSwap?.(item)}>
        {t('cards.propose')}
      </Button>
    </article>
  );
};
