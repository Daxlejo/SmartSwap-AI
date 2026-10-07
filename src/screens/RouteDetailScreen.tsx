import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapRoute, Item } from '@/types';
import { RouteStep } from '@/components/RouteStep';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export const RouteDetailScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const route = location.state?.route as SwapRoute;
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (!route) {
    navigate('/home');
    return null;
  }

  const handlePropose = () => {
    navigate('/swap/proposal/confirm', { state: { route } });
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 relative">
      <div className="px-margin pt-4 pb-4 border-b border-border bg-surface-50 z-10 sticky top-0">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="success" className="flex items-center gap-1">
            <Icon name="check" className="w-3 h-3" />
            {route.stepsCount} {route.stepsCount === 1 ? 'cambio' : 'cambios'}
          </Badge>
          <Badge variant="info" className="flex items-center gap-1 text-blue-700 bg-blue-100">
            <Icon name="leaf" className="w-3 h-3" />
            -{route.co2SavedKg}kg CO₂
          </Badge>
        </div>
        <h2 className="text-h2 font-bold text-text-primary mb-1">Detalle de la ruta</h2>
        <p className="text-body-sm text-text-secondary">
          Esta ruta circular permite que todos obtengan lo que buscan.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-margin py-6">
        <div className="flex flex-col">
          {route.chainItems.map((item, index) => {
            const fromUser = route.participants[index];
            const toUser = route.participants[(index + 1) % route.participants.length];
            
            return (
              <RouteStep
                key={item.id}
                fromUser={fromUser}
                toUser={toUser}
                itemGiven={item}
                isFirst={index === 0}
                isLast={index === route.chainItems.length - 1}
                onItemClick={(i) => setSelectedItem(i)}
              />
            );
          })}
        </div>
      </div>

      <div className="p-margin bg-surface-50 border-t border-border mt-auto">
        <Button variant="primary" className="w-full py-3.5" onClick={handlePropose}>
          Proponer intercambio
        </Button>
      </div>

      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name}
      >
        {selectedItem && (
          <div className="flex flex-col gap-4">
            <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-48 object-cover rounded-xl" />
            <div>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="warning">{selectedItem.category}</Badge>
                <span className="text-body-sm font-medium text-text-secondary">{selectedItem.condition}</span>
              </div>
              <p className="text-body text-text-primary">{selectedItem.description}</p>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
