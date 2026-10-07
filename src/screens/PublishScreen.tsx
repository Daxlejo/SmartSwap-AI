import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export const PublishScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-margin text-center">
      <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4">
        <Icon name="add_a_photo" size="xl" />
      </div>
      <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
        Publicar Artículo
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mb-6">
        Aquí podrás subir fotos y detalles de los artículos que ya no usas para cambiarlos.
      </p>
      <Button variant="primary" size="md" onClick={() => navigate('/home')}>
        Ir a Inicio
      </Button>
    </div>
  );
};
