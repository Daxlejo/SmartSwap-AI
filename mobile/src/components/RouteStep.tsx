import React from 'react';
import type { Item, User } from '@/types';
import type { StepAcceptanceStatus } from '@/services/routes/routes.service';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';

export interface RouteStepProps {
  fromUser: User;
  toUser: User;
  itemGiven: Item;
  /** The signed-in user is the one who gives in this step. */
  isYou?: boolean;
  acceptance?: StepAcceptanceStatus;
  onItemClick?: (item: Item) => void;
}

/** One hand-over of the cycle: who gives what to whom, and whether the giver has accepted. */
export const RouteStep: React.FC<RouteStepProps> = ({
  fromUser,
  toUser,
  itemGiven,
  isYou = false,
  acceptance,
  onItemClick,
}) => {
  const { t } = useTranslation();
  const giver = isYou ? t('routeDetail.you') : fromUser.name;

  return (
    <li className="pb-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Avatar src={fromUser.avatarUrl} alt="" size="sm" className="shrink-0" />
          <p className="min-w-0 font-body-md text-body-md text-on-surface break-words">
            {t('routeDetail.handOver', { giver, receiver: toUser.name })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onItemClick?.(itemGiven)}
          className="w-full min-h-12 flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-left hover:bg-surface-container active:scale-[0.98] transition-all"
        >
          <span className="flex flex-col flex-1 min-w-0">
            <span className="font-label-lg text-label-lg text-on-surface line-clamp-2 break-words">
              {itemGiven.name}
            </span>
            {itemGiven.estimatedValue !== undefined && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {formatCop(itemGiven.estimatedValue)}
              </span>
            )}
          </span>
          <Icon name="chevron_right" size="md" className="text-on-surface-variant shrink-0" />
        </button>

        {acceptance && (
          <Badge
            variant={
              acceptance === 'ACCEPTED'
                ? 'success'
                : acceptance === 'DECLINED'
                  ? 'error'
                  : 'secondary-subtle'
            }
            className="self-start"
          >
            {acceptance === 'ACCEPTED'
              ? t('routeDetail.acceptance.accepted')
              : acceptance === 'DECLINED'
                ? t('routeDetail.acceptance.declined')
                : t('routeDetail.acceptance.pending')}
          </Badge>
        )}
      </div>
    </li>
  );
};
