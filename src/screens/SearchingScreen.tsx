import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { findRoutes } from '@/services/swapService';

const MESSAGES = [
  "Analizando inventarios...",
  "Buscando coincidencias cruzadas...",
  "Calculando rutas óptimas...",
  "Finalizando propuesta..."
];

export const SearchingScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const haveId = searchParams.get('have');
  const wantId = searchParams.get('want');
  
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!haveId || !wantId) {
      navigate('/home');
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 800);

    const performSearch = async () => {
      try {
        await findRoutes(haveId, wantId);
        navigate(`/swap/results?have=${haveId}&want=${wantId}`);
      } catch (error) {
        console.error("Error finding routes", error);
        navigate('/home');
      }
    };

    performSearch();

    return () => clearInterval(interval);
  }, [haveId, wantId, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-margin text-center relative overflow-hidden">
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-surface-container-high animate-ping opacity-30" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-secondary-container border-l-transparent animate-spin" />
        <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md">
          <Icon name="search" className="w-8 h-8" />
        </div>
      </div>

      <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-2">
        Buscando Rutas...
      </h2>
      <div className="h-6 mb-8">
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs animate-pulse">
          {MESSAGES[messageIndex]}
        </p>
      </div>

      <div className="w-full max-w-xs bg-surface-container-high rounded-full h-2 overflow-hidden mb-6">
        <div className="bg-primary h-full w-2/3 animate-pulse" />
      </div>
    </div>
  );
};
