import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { ItemImage } from '@/components/ui/ItemImage';
import { useTranslation } from '@/hooks/useTranslation';

/** What a trade card shows of an item: enough for the photo and the full name. */
export interface TradeCardItem {
  name: string;
  imageUrl?: string;
  category?: string;
}

export interface TradeCardProps {
  /** Route id; the card is `data-testid="trade-card-<id>"`. */
  id: string;
  person: { name: string; avatarUrl?: string; verified?: boolean };
  /** Small line under the name: code, when it was sent, progress. */
  meta?: string;
  status: { label: string; variant: NonNullable<BadgeProps['variant']> };
  offered?: TradeCardItem;
  received?: TradeCardItem;
  /** Inline note between the items and the actions (accepted, declined). */
  note?: React.ReactNode;
  /** Actions, stacked under the items; "View details" goes here. */
  children?: React.ReactNode;
}

// Names wrap only between words: never inside one, never with an ellipsis
const NAME_TEXT = 'break-normal [hyphens:manual]';

const ItemRow: React.FC<{ label: string; item?: TradeCardItem }> = ({ label, item }) => (
  <div className="flex items-center gap-3">
    <ItemImage
      src={item?.imageUrl}
      alt={item?.name ?? ''}
      category={item?.category}
      className="w-12 h-12 rounded-lg bg-surface-container shrink-0"
    />
    <div className="flex-1 min-w-0">
      <dt className="font-label-sm text-label-sm text-on-surface-variant">{label}</dt>
      <dd className={`font-body-md text-body-md font-semibold text-on-surface ${NAME_TEXT}`}>
        {item?.name ?? '—'}
      </dd>
    </div>
  </div>
);

/**
 * One swap in Swaps (received, sent and in progress), read top to bottom: who and
 * where it stands, then what you offer and what you receive, one per row with the
 * whole name, then the actions.
 */
export const TradeCard: React.FC<TradeCardProps> = ({
  id,
  person,
  meta,
  status,
  offered,
  received,
  note,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <article
      data-testid={`trade-card-${id}`}
      className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3"
    >
      <header className="flex items-start gap-3">
        <Avatar src={person.avatarUrl} alt={person.name} size="md" verified={person.verified} />
        <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
          <h2 className={`font-headline-sm text-[15px] leading-snug font-bold text-on-surface ${NAME_TEXT}`}>
            {person.name}
          </h2>
          {/* Small one-line pill under the name, so the name keeps the whole width */}
          <Badge variant={status.variant} className="whitespace-nowrap !px-2">
            {status.label}
          </Badge>
          {meta && (
            <p className="font-body-sm text-caption text-on-surface-variant">{meta}</p>
          )}
        </div>
      </header>

      <dl className="flex flex-col gap-2.5 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50">
        <ItemRow label={t('trades.youOffer')} item={offered} />
        <ItemRow label={t('trades.youReceive')} item={received} />
      </dl>

      {note}

      {children && <div className="flex flex-col gap-2">{children}</div>}
    </article>
  );
};
