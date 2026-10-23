import React from 'react';
import type { SwapRoute } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface RouteCardProps {
  route: SwapRoute;
  onClick: () => void;
}

const getShortItemLabel = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('bicicleta')) return 'Bicicleta';
  if (lower.includes('balón') || lower.includes('balon')) return 'Balón';
  if (lower.includes('sony') || lower.includes('audífonos') || lower.includes('auriculares')) {
    return 'Audífonos';
  }
  if (lower.includes('cámara') || lower.includes('camara') || lower.includes('fujifilm')) {
    return 'Cámara';
  }
  return name.split(' ')[0];
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
  const targetItem = route.chainItems[route.chainItems.length - 1];
  const receiverSource = route.participants[route.participants.length - 1];

  // Build chain preview text (e.g., "Bicicleta → Balón → Audífonos → Cámara")
  const previewLabels =
    route.chainItems.length === 5
      ? [
          getShortItemLabel(route.chainItems[0].name),
          getShortItemLabel(route.chainItems[1].name),
          getShortItemLabel(route.chainItems[2].name),
          getShortItemLabel(route.chainItems[4].name),
        ]
      : route.chainItems.map((item) => getShortItemLabel(item.name));

  const chainPreviewText = previewLabels.join(' → ');

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex flex-col rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 p-space-md shadow-sm space-y-4 active:scale-[0.99] transition-all cursor-pointer hover:border-primary/40"
    >
      {/* Top Badges: Steps count & CO2 saved */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="primary-subtle" icon="sync_alt">
            {route.stepsCount} {route.stepsCount === 1 ? 'paso' : 'pasos'}
          </Badge>
          <Badge
            variant="tertiary-subtle"
            icon="eco"
            iconFilled
            className="text-[#1a7a4a] bg-surface-container-low border border-surface-container-high/60"
          >
            {route.co2SavedKg} kg CO₂ ahorrados
          </Badge>
        </div>

        <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
          <Icon name="group" size="xs" className="text-primary" />
          {route.participants.length} usuarios
        </span>
      </div>

      {/* Objective Label & Target Item */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={targetItem.imageUrl}
            alt={targetItem.name}
            className="w-12 h-12 rounded-xl object-cover bg-surface-container-low border border-surface-container-high/60 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider">
              Objetivo Deseado
            </span>
            <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
              {targetItem.name}
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              Recibes de {receiverSource?.name ?? 'Usuario verificado'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="font-headline-sm text-headline-sm text-primary font-bold">
            $0
          </span>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Sin dinero</p>
        </div>
      </div>

      {/* Route Chain Preview (Consistent with HomeScreen visual chain) */}
      <div className="flex flex-col space-y-2.5 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
            Cadena de canje:
          </span>
          <span className="font-label-sm text-label-sm text-primary font-bold truncate">
            {chainPreviewText}
          </span>
        </div>

        {/* Visual Chain Thumbnails */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
          {route.chainItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === route.chainItems.length - 1;

            return (
              <div key={item.id} className="flex items-center shrink-0">
                <div className="flex flex-col items-center min-w-[52px]">
                  <div
                    className={`relative w-11 h-11 rounded-xl bg-surface-container-highest overflow-hidden shadow-xs flex items-center justify-center ${
                      isLast ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {isFirst && (
                      <span className="absolute bottom-0 right-0 px-1 bg-primary text-on-primary rounded-tl-md font-label-sm text-[8px] font-bold">
                        Tú
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-label-sm text-[11px] font-semibold text-center mt-1 truncate max-w-[58px] ${
                      isLast ? 'text-primary font-bold' : 'text-on-surface'
                    }`}
                  >
                    {getShortItemLabel(item.name)}
                  </span>
                </div>

                {!isLast && (
                  <div className="flex flex-col items-center px-0.5 shrink-0 text-primary">
                    <Icon name="arrow_forward" size="xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-1">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Custodia protegida SmartSwap
        </span>
        <Button
          variant="primary"
          size="sm"
          rightIcon="arrow_forward"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Ver ruta
        </Button>
      </div>
    </div>
  );
};
