import React from 'react';
import { Proposal, Item, User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemImage } from '@/components/ui/ItemImage';

export interface ProposalCardProps {
  proposal: Proposal;
  targetItem?: Item;
  offeredItem?: Item;
  otherUser?: User;
  isReceived?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onClick?: () => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  targetItem,
  offeredItem,
  otherUser,
  isReceived,
  onAccept,
  onDecline,
  onClick
}) => {
  const { t } = useTranslation();
  if (!targetItem || !offeredItem || !otherUser) return null;

  return (
    <div 
      className="bg-surface-container-lowest border border-surface-container-high/60 rounded-2xl p-4 shadow-sm"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Avatar src={otherUser.avatarUrl} alt={otherUser.name} size="sm" />
          <span className="font-body-sm text-body-sm font-medium text-on-surface">{otherUser.name}</span>
        </div>
        <Badge variant={proposal.status === 'pending' ? 'warning' : proposal.status === 'accepted' ? 'success' : 'error'}>
          {proposal.status === 'pending' ? t('cards.status.pending') : proposal.status === 'accepted' ? t('cards.status.accepted') : t('cards.status.declined')}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between mb-4 bg-surface-container-low p-3 rounded-xl border border-surface-container-high/60">
        <div className="flex-1 flex flex-col items-center">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-secondary font-bold mb-1">
            {isReceived ? t('cards.theyOffer') : t('cards.youOffer')}
          </span>
          <ItemImage src={offeredItem.imageUrl} alt={offeredItem.name} category={offeredItem.category} className="w-14 h-14 rounded-lg mb-1.5 border border-surface-container-high/60 bg-surface-container-highest" />
          <span className="font-body-sm text-body-sm font-medium text-on-surface text-center line-clamp-1">
            {offeredItem.name}
          </span>
        </div>
        
        <div className="px-3 text-primary flex flex-col items-center">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-semibold">
            {t('cards.swapFor')}
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8l4 4-4 4" />
            <path d="M3 12h18" />
          </svg>
        </div>
        
        <div className="flex-1 flex flex-col items-center">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary font-bold mb-1">
            {isReceived ? t('cards.yourItem') : t('cards.youWant')}
          </span>
          <ItemImage src={targetItem.imageUrl} alt={targetItem.name} category={targetItem.category} className="w-14 h-14 rounded-lg mb-1.5 border border-surface-container-high/60 bg-surface-container-highest" />
          <span className="font-body-sm text-body-sm font-medium text-on-surface text-center line-clamp-1">
            {targetItem.name}
          </span>
        </div>
      </div>
      
      {isReceived && proposal.status === 'pending' && (
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onDecline?.(); }}>
            {t('cards.decline')}
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onAccept?.(); }}>
            {t('cards.accept')}
          </Button>
        </div>
      )}
    </div>
  );
};
