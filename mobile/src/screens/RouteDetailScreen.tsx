import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { SwapRoute, Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { routesService, formatMatchScore } from '@/services/routes/routes.service';
import { mockSwapRoute } from '@/data/mockData';
import { RouteStep } from '@/components/RouteStep';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export const RouteDetailScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { routeId: routeIdParam } = useParams<{ routeId: string }>();
  const { routes } = useApp();

  const initialRoute =
    (location.state?.route as SwapRoute | undefined) ??
    routes.find((r) => r.id === routeIdParam || r.code === routeIdParam) ??
    mockSwapRoute;

  const [route, setRoute] = useState<SwapRoute>(initialRoute);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    let isMounted = true;
    const stateRoute = location.state?.route as SwapRoute | undefined;
    if (stateRoute) {
      setRoute(stateRoute);
      return;
    }

    if (routeIdParam) {
      routesService
        .getRouteById(routeIdParam)
        .then((fetched) => {
          if (isMounted && fetched) {
            setRoute(fetched);
          }
        })
        .catch(() => {
          // Keep initial fallback route
        });
    }

    return () => {
      isMounted = false;
    };
  }, [routeIdParam, location.state]);

  const handlePropose = () => {
    navigate('/swap/proposal/confirm', { state: { route } });
  };

  const matchPct = formatMatchScore(route.matchScore);
  const aiExplanationText =
    route.aiExplanation ||
    `Ciclo circular equilibrado de ${route.stepsCount} pasos: los valores estimados de los artículos están balanceados sin requerir dinero adicional, evitando ${route.co2SavedKg} kg de CO₂.`;

  return (
    <div className="flex flex-col h-full bg-surface relative">
      <div className="px-margin pt-4 pb-4 border-b border-surface-container-high/60 bg-surface z-10 sticky top-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
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
          <Badge variant="primary-subtle" className="flex items-center gap-1">
            <Icon name="auto_awesome" size="xs" />
            <span>{matchPct}% coincidencia</span>
          </Badge>
        </div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">
          Detalle de la ruta
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Esta ruta circular permite que todos obtengan lo que buscan.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-margin py-5 space-y-5">
        {/* AI Fairness & Environmental Impact Card */}
        <section
          aria-label="Explicación IA de equidad"
          className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-2.5 shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-primary">
              <Icon name="psychology" size="sm" filled />
              <h3 className="font-headline-sm text-headline-sm font-bold">
                Análisis IA de Equidad Circular
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-surface-container-high font-label-sm text-[11px] font-bold text-[#1a7a4a] flex items-center gap-1">
              <Icon name="eco" size="xs" filled />
              {route.co2SavedKg} kg CO₂ ahorrados
            </span>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            {aiExplanationText}
          </p>
        </section>

        {/* Steps Timeline with Item Values & Acceptance Status */}
        <div className="flex flex-col">
          {route.chainItems.map((item, index) => {
            const fromUser = route.participants[index] || route.participants[0];
            const toUser = route.participants[(index + 1) % route.participants.length];
            const stepDetail = route.steps?.[index];
            const stepValue = item.estimatedValue ?? 450;
            const acceptance = stepDetail?.acceptance;

            return (
              <div key={`${item.id}-${index}`} className="flex flex-col">
                <RouteStep
                  fromUser={fromUser}
                  toUser={toUser}
                  itemGiven={item}
                  isFirst={index === 0}
                  isLast={index === route.chainItems.length - 1}
                  onItemClick={(i) => setSelectedItem(i)}
                />

                {/* Step Valuation & Acceptance Pill bar right under the step card */}
                <div className="ml-14 -mt-3 mb-4 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                  <div className="flex items-center gap-1.5">
                    <Icon name="payments" size="xs" className="text-primary" />
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      Valor estimado:
                    </span>
                    <span className="font-label-sm text-[11px] font-bold text-on-surface">
                      ${stepValue} USD
                    </span>
                  </div>

                  {acceptance && (
                    <Badge
                      variant={
                        acceptance === 'ACCEPTED'
                          ? 'success'
                          : acceptance === 'DECLINED'
                            ? 'error'
                            : 'secondary-subtle'
                      }
                      className="text-[10px] py-0"
                    >
                      {acceptance === 'ACCEPTED'
                        ? 'Aceptado'
                        : acceptance === 'DECLINED'
                          ? 'Rechazado'
                          : 'Pendiente'}
                    </Badge>
                  )}
                </div>
              </div>
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
                <div className="flex items-center gap-2">
                  <span className="font-label-md text-label-md font-bold text-primary">
                    ${selectedItem.estimatedValue ?? 450} USD
                  </span>
                  <span className="font-body-sm text-body-sm font-medium text-on-surface-variant">
                    {selectedItem.condition}
                  </span>
                </div>
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
