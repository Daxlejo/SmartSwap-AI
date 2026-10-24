import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapRoute, Item } from '@/types';
import { mockSwapRoute } from '@/data/mockData';
import { RouteStep } from '@/components/RouteStep';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export const RouteDetailScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const route = (location.state?.route as SwapRoute | undefined) ?? mockSwapRoute;

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handlePropose = () => {
    navigate('/swap/proposal/confirm', { state: { route } });
  };

  return (
    <div className="flex flex-col h-full bg-surface relative">
      <div className="px-margin pt-4 pb-4 border-b border-surface-container-high/60 bg-surface z-10 sticky top-0">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="success" className="flex items-center gap-1">
            <Icon name="check" size="xs" />
            <span>
              {route.stepsCount} {route.stepsCount === 1 ? 'cambio' : 'cambios'}
            </span>
          </Badge>
          <Badge
            variant="tertiary-subtle"
            className="flex items-center gap-1 text-tertiary bg-tertiary-fixed"
          >
            <Icon name="eco" size="xs" />
            <span>-{route.co2SavedKg}kg CO₂</span>
          </Badge>
        </div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">
          Detalle de la ruta
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
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

      <div className="p-margin bg-surface border-t border-surface-container-high/60 mt-auto">
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
            <img
              src={selectedItem.imageUrl}
              alt={selectedItem.name}
              className="w-full h-48 object-cover rounded-xl"
            />
            <div>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="warning">{selectedItem.category}</Badge>
                <span className="font-body-sm text-body-sm font-medium text-on-surface-variant">
                  {selectedItem.condition}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface">
                {selectedItem.description}
              </p>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
