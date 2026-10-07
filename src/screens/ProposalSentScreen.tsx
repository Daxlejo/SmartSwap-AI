import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export const ProposalSentScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full px-margin text-center bg-surface-50">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-sm">
        <Icon name="check" className="w-12 h-12" />
      </div>
      
      <h2 className="text-h2 font-bold text-text-primary mb-3">
        ¡Propuesta Enviada!
      </h2>
      
      <p className="text-body text-text-secondary mb-10 max-w-[280px]">
        Se ha notificado a los demás usuarios de la cadena. Te avisaremos cuando todos aprueben el canje.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
        <Button variant="primary" className="py-3.5" onClick={() => navigate('/swaps')}>
          Ver mis intercambios
        </Button>
        <Button variant="outline" className="py-3.5" onClick={() => navigate('/home')}>
          Volver al Inicio
        </Button>
      </div>
    </div>
  );
};
