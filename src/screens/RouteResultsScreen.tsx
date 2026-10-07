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
  const haveId = searchParams.get('have');
  const wantId = searchParams.get('want');
  
  const [routes, setRoutes] = useState<SwapRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!haveId || !wantId) {
      navigate('/home');
      return;
    }

    const loadRoutes = async () => {
      setIsLoading(true);
      try {
        const result = await findRoutes(haveId, wantId);
        setRoutes(result);
      } catch (error) {
        console.error("Failed to load routes", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutes();
  }, [haveId, wantId, navigate]);

  if (isLoading) {
    return <div className="p-4 text-center mt-10">Cargando resultados...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-surface-50">
      <div className="px-margin pt-4 pb-2">
        <h2 className="text-h2 font-bold text-text-primary mb-1">Rutas Encontradas</h2>
        <p className="text-body text-text-secondary">
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
                onClick={() => navigate(`/swap/route/${route.id}`, { state: { route } })} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
