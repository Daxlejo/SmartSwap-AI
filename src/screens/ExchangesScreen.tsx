import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export const ExchangesScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-margin text-center">
      <div className="w-16 h-16 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center mb-4">
        <Icon name="sync_alt" size="xl" />
      </div>
      <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
        Tus Canjes Activos
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mb-6">
        Aquí gestionarás tus propuestas de intercambio, estado de entrega y depósitos en custodia.
      </p>
      <Button variant="primary" size="md" onClick={() => navigate('/home')}>
        Ir a Inicio
      </Button>
    </div>
  );
};
