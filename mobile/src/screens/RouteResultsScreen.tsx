import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { findRoutes } from '@/services/swapService';
import { SwapRoute } from '@/types';
import { RouteCard } from '@/components/RouteCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export const RouteResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const haveId = searchParams.get('have') || 'item-bike';
  const wantId = searchParams.get('want') || 'item-camera';

  const [routes, setRoutes] = useState<SwapRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoutes = async () => {
      setIsLoading(true);
      try {
        const result = await findRoutes(haveId, wantId);
        setRoutes(result);
      } catch (error) {
        console.error('Failed to load routes', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutes();
  }, [haveId, wantId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-surface">
        <div className="px-margin pt-4 pb-2">
          <div className="h-8 w-52 bg-surface-container-low rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-36 bg-surface-container-low rounded-md animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto px-margin py-4">
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="rounded-2xl p-4 bg-surface-container-low border border-surface-container-high/60 animate-pulse flex flex-col gap-3"
              >
                {/* Header row: badge and participants indicator + action pill */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 rounded-full bg-surface-container-high" />
                    <div className="h-4 w-20 rounded-md bg-surface-container-high" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-surface-container-high" />
                </div>

                {/* Inner target item card container */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-surface-container-high/60">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high shrink-0" />
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="h-4 w-3/4 rounded-md bg-surface-container-high" />
                    <div className="h-3 w-1/2 rounded-md bg-surface-container-high" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-margin pt-4 pb-2">
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">
          Rutas Encontradas
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {routes.length} {routes.length === 1 ? 'opción' : 'opciones'} disponibles
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-margin py-4">
        {routes.length === 0 ? (
          <EmptyState
            iconName="search"
            title="Sin rutas disponibles"
            description="No encontramos una cadena de canje para estos artículos en este momento."
            action={
              <Button variant="primary" onClick={() => navigate('/home')}>
                Volver al Inicio
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onClick={() => navigate('/swap/route/' + route.id, { state: { route } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
