import type { Item, User } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';
import { Icon } from '@/components/ui/Icon';

export interface ObjectCardProps {
  item: Item;
  owner?: User;
  /** Opens the item's detail, where the swap is proposed. */
  onOpen: (item: Item) => void;
  className?: string;
}

/**
 * Catalog card: full name (up to two lines), photo and one support text (condition ·
 * place). The whole card is one button that opens the item's detail; proposing a
 * swap happens there, after seeing the item.
 */
export const ObjectCard = ({ item, owner, onOpen, className }: ObjectCardProps) => {
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
    <button
      type="button"
      data-testid={`object-card-${item.id}`}
      onClick={() => onOpen(item)}
      aria-label={t('explore.viewDetails', { name: item.name })}
      className={`w-full text-left flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container-high hover:bg-surface-container-low active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className ?? ''}`}
    >
      <ItemImage
        src={item.imageUrl}
        alt=""
        itemName={item.name}
        category={item.category}
        className="w-20 h-20 rounded-xl bg-surface-container-high shrink-0"
      />
      <span className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="font-headline-sm text-headline-sm text-on-surface break-words">{item.name}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant break-words">{support}</span>
      </span>
      <Icon name="chevron_right" size="md" className="text-on-surface-variant shrink-0" />
    </button>
  );
};
