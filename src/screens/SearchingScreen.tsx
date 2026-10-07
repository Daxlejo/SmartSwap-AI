import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export const SearchingScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-margin text-center">
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-surface-container-high animate-ping opacity-30" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-secondary-container border-l-transparent animate-spin" />
        <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md">
          <Icon name="hub" size="lg" filled />
        </div>
      </div>

      <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-2">
        Buscando Rutas de Canje...
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mb-8">
        Explorando circuitos multiusuario para tu artículo en la red SmartSwap en tiempo real.
      </p>

      <div className="w-full max-w-xs bg-surface-container-high rounded-full h-2 overflow-hidden mb-6">
        <div className="bg-primary h-full w-2/3 animate-pulse" />
      </div>

      <Button variant="tonal" size="md" onClick={() => navigate('/home')}>
        Volver al Inicio
      </Button>
    </div>
  );
};
