import React from 'react';
import { Item, User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';

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
  isLast,
  onItemClick
}) => {
  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute top-10 bottom-0 left-6 w-0.5 bg-border -ml-[1px]" />
      )}
      
      {/* Sender Avatar */}
      <div className="relative z-10 flex flex-col items-center mt-1">
        <Avatar src={fromUser.avatarUrl} alt={fromUser.name} size="md" className="border-2 border-surface-50 shadow-sm" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="bg-surface-50 border border-border rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-body-sm font-semibold text-text-primary">{fromUser.name}</span>
            <Icon name="arrow-right" className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-body-sm text-text-secondary">{toUser.name}</span>
          </div>
          
          <div 
            className="flex items-center gap-3 bg-surface-100 p-2 rounded-lg cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => onItemClick && onItemClick(itemGiven)}
          >
            <img src={itemGiven.imageUrl} alt={itemGiven.name} className="w-10 h-10 rounded object-cover" />
            <div className="flex-1">
              <p className="text-body-sm font-medium text-text-primary line-clamp-1">{itemGiven.name}</p>
              <p className="text-xs text-brand-primary mt-0.5">Ver detalle</p>
            </div>
            <Icon name="chevron-right" className="w-4 h-4 text-text-muted" />
          </div>
        </div>
      </div>
    </div>
  );
};
