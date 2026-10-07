import React from 'react';
import { Proposal, Item, User } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
  if (!targetItem || !offeredItem || !otherUser) return null;

  return (
    <div 
      className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Avatar src={otherUser.avatarUrl} alt={otherUser.name} size="sm" />
          <span className="text-body-sm font-medium text-text-primary">{otherUser.name}</span>
        </div>
        <Badge variant={proposal.status === 'pending' ? 'warning' : proposal.status === 'accepted' ? 'success' : 'error'}>
          {proposal.status === 'pending' ? 'Pendiente' : proposal.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between mb-4 bg-surface-100 p-3 rounded-lg border border-border">
        <div className="flex-1 flex flex-col items-center">
          <img src={isReceived ? targetItem.imageUrl : offeredItem.imageUrl} alt="Ofrece" className="w-14 h-14 rounded-lg object-cover mb-2 border border-border bg-surface-50" />
          <span className="text-xs font-medium text-text-secondary text-center line-clamp-1">{isReceived ? targetItem.name : offeredItem.name}</span>
        </div>
        
        <div className="px-3 text-brand-primary flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-semibold">Cambio por</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8l4 4-4 4" />
            <path d="M3 12h18" />
          </svg>
        </div>
        
        <div className="flex-1 flex flex-col items-center">
          <img src={isReceived ? offeredItem.imageUrl : targetItem.imageUrl} alt="Recibe" className="w-14 h-14 rounded-lg object-cover mb-2 border border-border bg-surface-50" />
          <span className="text-xs font-medium text-text-secondary text-center line-clamp-1">{isReceived ? offeredItem.name : targetItem.name}</span>
        </div>
      </div>
      
      {isReceived && proposal.status === 'pending' && (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 py-2 text-sm" onClick={(e) => { e.stopPropagation(); onDecline?.(); }}>
            Rechazar
          </Button>
          <Button variant="primary" className="flex-1 py-2 text-sm" onClick={(e) => { e.stopPropagation(); onAccept?.(); }}>
            Aceptar
          </Button>
        </div>
      )}
    </div>
  );
};
