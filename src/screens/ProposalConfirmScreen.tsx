import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapRoute } from '@/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export const ProposalConfirmScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const route = location.state?.route as SwapRoute;
  
  const [isSending, setIsSending] = useState(false);

  if (!route) {
    navigate('/home');
    return null;
  }

  // Current user gives the first item in the chain (index 0) to the second user (index 1)
  const offeredItem = route.chainItems[0];
  const targetUser = route.participants[1];
  
  // Current user receives the last item in the chain from the last user
  const targetItem = route.chainItems[route.chainItems.length - 1];
  const sourceUser = route.participants[route.participants.length - 1];

  const handleConfirm = () => {
    setIsSending(true);
    setTimeout(() => {
      navigate('/swap/proposal/sent', { state: { targetUser, sourceUser } });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 px-margin pt-6 pb-6">
      <h2 className="text-h2 font-bold text-text-primary mb-6 text-center">Confirmar Propuesta</h2>
      
      <div className="flex-1 flex flex-col gap-6">
        {/* Yo ofrezco */}
        <div className="bg-surface-100 rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-body-sm font-bold text-text-secondary uppercase tracking-wider">Yo ofrezco</span>
            <span className="text-body-sm text-text-muted">A {targetUser.name}</span>
          </div>
          <div className="flex gap-4">
            <img src={offeredItem.imageUrl} alt={offeredItem.name} className="w-16 h-16 rounded-xl object-cover bg-surface-50" />
            <div className="flex-1 justify-center flex flex-col">
              <h4 className="font-semibold text-text-primary line-clamp-1">{offeredItem.name}</h4>
              <p className="text-body-sm text-text-secondary line-clamp-1">{offeredItem.condition}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center -my-3 z-10">
          <div className="bg-brand-primary text-white p-2.5 rounded-full shadow-md">
            <Icon name="arrow-down" className="w-5 h-5" />
          </div>
        </div>

        {/* Quiero recibir */}
        <div className="bg-brand-primary/5 rounded-2xl p-4 border border-brand-primary/20 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-body-sm font-bold text-brand-primary uppercase tracking-wider">Quiero recibir</span>
            <span className="text-body-sm text-text-muted">De {sourceUser.name}</span>
          </div>
          <div className="flex gap-4">
            <img src={targetItem.imageUrl} alt={targetItem.name} className="w-16 h-16 rounded-xl object-cover bg-surface-50 border border-brand-primary/10" />
            <div className="flex-1 justify-center flex flex-col">
              <h4 className="font-semibold text-text-primary line-clamp-1">{targetItem.name}</h4>
              <p className="text-body-sm text-text-secondary line-clamp-1">{targetItem.condition}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center px-2">
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Al confirmar, se enviará una notificación a todos los usuarios de la cadena para que aprueben el canje.
          </p>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Button 
          variant="primary" 
          className="w-full py-3.5 text-lg" 
          onClick={handleConfirm}
          disabled={isSending}
        >
          {isSending ? 'Enviando Propuesta...' : 'Confirmar Propuesta'}
        </Button>
      </div>
    </div>
  );
};
