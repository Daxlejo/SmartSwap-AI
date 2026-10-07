import React from 'react';
import { SwapRoute } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';

export interface RouteCardProps {
  route: SwapRoute;
  onClick: () => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
  const targetItem = route.chainItems[route.chainItems.length - 1];
  
  return (
    <div 
      className="bg-surface-50 border border-border rounded-xl p-4 shadow-elevation-1 active:scale-[0.98] transition-transform cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1">
            <Icon name="check" className="w-3 h-3" />
            {route.stepsCount} {route.stepsCount === 1 ? 'cambio' : 'cambios'}
          </Badge>
          <span className="text-body-sm text-text-secondary flex items-center gap-1">
            <Icon name="users" className="w-3.5 h-3.5" />
            {route.participants.length} usuarios
          </span>
        </div>
        <div className="bg-surface-200 text-brand-primary p-1.5 rounded-full">
          <Icon name="chevron-right" className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-surface-100 p-3 rounded-lg border border-border">
        <img 
          src={targetItem.imageUrl} 
          alt={targetItem.name} 
          className="w-12 h-12 rounded-md object-cover" 
        />
        <div>
          <h4 className="text-body font-semibold text-text-primary line-clamp-1">{targetItem.name}</h4>
          <p className="text-body-sm text-text-secondary">Recibes de {route.participants[route.participants.length - 1].name.split(' ')[0]}</p>
        </div>
      </div>
    </div>
  );
};
