import React from 'react';
import type { Item, User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

export interface RouteStepProps {
  fromUser: User;
  toUser: User;
  itemGiven: Item;
  isFirst?: boolean;
  isLast?: boolean;
  onItemClick?: (item: Item) => void;
}

export const RouteStep: React.FC<RouteStepProps> = ({
  fromUser,
  toUser,
  itemGiven,
  isFirst = false,
  isLast = false,
  onItemClick,
}) => {
  const { t } = useTranslation();
  return (
    <div className="relative flex gap-3.5">
      {/* Vertical Timeline Connector */}
      {!isLast && (
        <div className="absolute top-11 bottom-0 left-5 border-l-2 border-surface-container-high/60 -ml-[1px]" />
      )}

      {/* Sender Avatar */}
      <div className="relative z-10 flex flex-col items-center mt-1 shrink-0">
        <Avatar
          src={fromUser.avatarUrl}
          alt={fromUser.name}
          size="md"
          verified={fromUser.verified}
          className="ring-2 ring-surface shadow-xs"
        />
      </div>

      {/* Step Card Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-3.5 space-y-2.5">
          {/* From User -> To User Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                {fromUser.name}
              </span>
              {isFirst && (
                <Badge variant="primary" className="px-2 py-0.2">
                  {t('cards.you')}
                </Badge>
              )}
              <Icon
                name="arrow_forward"
                size="sm"
                className="text-primary shrink-0 mx-0.5"
              />
              <span className="font-body-md text-body-md text-on-surface-variant font-medium truncate">
                {toUser.name}
              </span>
            </div>
          </div>

          {/* Item Given Box */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onItemClick && onItemClick(itemGiven)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onItemClick) {
                e.preventDefault();
                onItemClick(itemGiven);
              }
            }}
            className="flex items-center gap-3 bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high/60 cursor-pointer hover:bg-surface-container active:scale-[0.98] transition-all"
          >
            <img
              src={itemGiven.imageUrl}
              alt={itemGiven.name}
              className="w-12 h-12 rounded-xl object-cover bg-surface-container-lowest shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-body-md text-body-md font-semibold text-on-surface truncate">
                {itemGiven.name}
              </p>
              <p className="font-label-sm text-label-sm text-primary font-bold mt-0.5">
                {t('cards.chainDelivery')}
              </p>
            </div>
            <Icon name="chevron_right" size="md" className="text-on-surface-variant shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};
