import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockSwapRoute } from '@/data/mockData';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';

// Mock avatars
import mateoAvatar from '@/assets/avatar-mateo.svg';
import sofiaAvatar from '@/assets/avatar-sofia.svg';
import carlosAvatar from '@/assets/avatar-carlos.svg';

// Mock item images
import bikeImg from '@/assets/item-bike.svg';
import ballImg from '@/assets/item-ball.svg';
import switchImg from '@/assets/item-switch.svg';
import headphonesImg from '@/assets/item-headphones.svg';
import cameraImg from '@/assets/item-camera.svg';
import lensImg from '@/assets/item-lens.svg';

type TabType = 'recibidas' | 'enviadas' | 'en_curso';

interface ReceivedProposal {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderRating: number;
  senderVerified: boolean;
  offeredItemName: string;
  offeredItemImg: string;
  targetItemName: string;
  targetItemImg: string;
  timeAgo: string;
  status: 'pending' | 'accepted' | 'declined';
}

export const TradesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('recibidas');

  // Recibidas state
  const [receivedProposals, setReceivedProposals] = useState<ReceivedProposal[]>([
    {
      id: 'prop-recv-1',
      senderName: 'Mateo R.',
      senderAvatar: mateoAvatar,
      senderRating: 4.8,
      senderVerified: false,
      offeredItemName: 'Nintendo Switch OLED',
      offeredItemImg: switchImg,
      targetItemName: 'Bicicleta Trek Marlin 7',
      targetItemImg: bikeImg,
      timeAgo: 'hace 2 horas',
      status: 'pending',
    },
    {
      id: 'prop-recv-2',
      senderName: 'Sofía V.',
      senderAvatar: sofiaAvatar,
      senderRating: 5.0,
      senderVerified: true,
      offeredItemName: 'Lente Fujinon 35mm f/1.4',
      offeredItemImg: lensImg,
      targetItemName: 'Bicicleta Trek Marlin 7',
      targetItemImg: bikeImg,
      timeAgo: 'hace 5 horas',
      status: 'pending',
    },
  ]);

  // Enviadas state
  const [sentCancelled, setSentCancelled] = useState(false);

  const handleAcceptProposal = (id: string) => {
    setReceivedProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'accepted' as const } : p)),
    );
  };

  const handleDeclineProposal = (id: string) => {
    setReceivedProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'declined' as const } : p)),
    );
  };

  // 4 items for chain visual in En Curso
  const chainSteps = [
    { name: 'Bicicleta', img: bikeImg, user: 'Tú' },
    { name: 'Balón', img: ballImg, user: 'Carlos V.' },
    { name: 'Audífonos', img: headphonesImg, user: 'Laura M.' },
    { name: 'Cámara', img: cameraImg, user: 'Sofía V.' },
  ];

  return (
    <div className="flex flex-col min-h-full bg-surface px-margin pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
          Mis Canjes
        </h1>
        <Badge variant="primary-subtle" icon="verified_user">
          Modo Seguro
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-surface-container-low border border-surface-container-high/60 gap-1 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('recibidas')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'recibidas'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Recibidas</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'recibidas'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            2
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enviadas')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'enviadas'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Enviadas</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'enviadas'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            1
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('en_curso')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'en_curso'
              ? 'bg-surface text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>En Curso</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'en_curso'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            1
          </span>
        </button>
      </div>

      {/* Tab: Recibidas */}
      {activeTab === 'recibidas' && (
        <div className="flex flex-col gap-3.5">
          {receivedProposals.map((proposal) => {
            const isAccepted = proposal.status === 'accepted';
            const isDeclined = proposal.status === 'declined';

            return (
              <div
                key={proposal.id}
                className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3"
              >
                {/* Header: Sender + Rating + Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={proposal.senderAvatar}
                      alt={proposal.senderName}
                      size="md"
                      verified={proposal.senderVerified}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-[14px] font-bold text-on-surface truncate">
                          {proposal.senderName}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-label-sm text-[11px] text-on-surface font-semibold">
                          <Icon name="star" size="xs" filled className="text-secondary" />
                          {proposal.senderRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">
                        {proposal.timeAgo}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={isAccepted ? 'success' : isDeclined ? 'error' : 'secondary-subtle'}
                  >
                    {isAccepted ? 'Aceptado' : isDeclined ? 'Rechazado' : 'Pendiente'}
                  </Badge>
                </div>

                {/* Items exchanged comparison */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                  {/* Offers */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={proposal.offeredItemImg}
                      alt={proposal.offeredItemName}
                      className="w-11 h-11 rounded-lg object-cover bg-surface-container shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wider">
                        Ofrece:
                      </span>
                      <span className="font-body-sm text-[12px] font-semibold text-on-surface truncate">
                        {proposal.offeredItemName}
                      </span>
                    </div>
                  </div>

                  <Icon name="sync_alt" size="xs" className="text-outline shrink-0" />

                  {/* Wants */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={proposal.targetItemImg}
                      alt={proposal.targetItemName}
                      className="w-11 h-11 rounded-lg object-cover bg-surface-container shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[10px] text-primary font-bold uppercase tracking-wider">
                        A cambio de:
                      </span>
                      <span className="font-body-sm text-[12px] font-semibold text-on-surface truncate">
                        {proposal.targetItemName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions or Success/Decline Inline State */}
                {isAccepted ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Icon name="check_circle" size="sm" filled />
                    <span className="font-label-md text-label-md font-bold">
                      ¡Aceptado! El canje continúa.
                    </span>
                  </div>
                ) : isDeclined ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container text-on-surface-variant font-body-sm text-body-sm">
                    <Icon name="cancel" size="sm" />
                    <span>Propuesta rechazada</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container-low">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineProposal(proposal.id)}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcceptProposal(proposal.id)}
                    >
                      Aceptar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Enviadas */}
      {activeTab === 'enviadas' && (
        <div className="flex flex-col gap-3.5">
          {sentCancelled ? (
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 text-center">
              <Icon name="check_circle" size="lg" className="text-primary mb-2" />
              <p className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Propuesta cancelada
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Tu artículo ha vuelto a estar disponible para otras propuestas circulares.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSentCancelled(false)}
              >
                Deshacer
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={carlosAvatar}
                    alt="Carlos V."
                    size="md"
                    verified
                  />
                  <div>
                    <h2 className="font-headline-sm text-[15px] font-bold text-on-surface">
                      Tu oferta a Carlos V.
                    </h2>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      Enviada hace 1 hora
                    </span>
                  </div>
                </div>

                <Badge variant="warning">En revisión</Badge>
              </div>

              {/* Trade exchange flow: Bicicleta Trek -> Balón FIFA */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={bikeImg}
                    alt="Bicicleta Trek"
                    className="w-12 h-12 rounded-lg object-cover bg-surface-container shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-[10px] text-outline uppercase font-bold">
                      Ofreces
                    </span>
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                      Bicicleta Trek
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center px-1 text-primary">
                  <Icon name="arrow_forward" size="sm" />
                </div>

                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={ballImg}
                    alt="Balón FIFA"
                    className="w-12 h-12 rounded-lg object-cover bg-surface-container shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-[10px] text-outline uppercase font-bold">
                      A cambio
                    </span>
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                      Balón FIFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end pt-1 border-t border-surface-container-low">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSentCancelled(true)}
                  className="text-error hover:bg-error-container/20"
                >
                  Cancelar propuesta
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: En Curso */}
      {activeTab === 'en_curso' && (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-label-sm text-[11px] text-secondary font-bold uppercase tracking-wider">
                  Circuito Multi-Canje SR-8492
                </span>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Paso 1 de 4 completado
                </h2>
              </div>
              <Badge variant="primary">Activo</Badge>
            </div>

            {/* Simple progress bar (25% filled, primary color) */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: '25%' }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-label-sm text-on-surface-variant font-medium">
                <span>Progreso: 25%</span>
                <span>Faltan 3 pasos</span>
              </div>
            </div>

            {/* Route chain visual: Bicicleta → Balón → Audífonos → Cámara */}
            <div className="flex flex-col space-y-2 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50">
              <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold">
                Cadena del Circuito:
              </span>

              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                {chainSteps.map((step, idx) => {
                  const isLast = idx === chainSteps.length - 1;

                  return (
                    <div key={step.name} className="flex items-center shrink-0">
                      <div className="flex flex-col items-center min-w-[56px]">
                        <div
                          className={`relative w-12 h-12 rounded-xl bg-surface-container-highest overflow-hidden shadow-xs flex items-center justify-center ${
                            idx === 0 ? 'ring-2 ring-primary ring-offset-1' : ''
                          }`}
                        >
                          <img
                            src={step.img}
                            alt={step.name}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute bottom-0 right-0 px-1 bg-primary text-on-primary rounded-tl-md font-label-sm text-[8px] font-bold">
                              Tú
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-label-sm text-[11px] font-semibold text-center mt-1 truncate max-w-[62px] ${
                            idx === 0 ? 'text-primary font-bold' : 'text-on-surface'
                          }`}
                        >
                          {step.name}
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

            {/* Ver detalles button */}
            <Button
              variant="primary"
              size="md"
              fullWidth
              rightIcon="arrow_forward"
              onClick={() =>
                navigate('/swap/route/SR-8492', { state: { route: mockSwapRoute } })
              }
            >
              Ver detalles
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Eco Banner */}
      <div className="mt-auto pt-2">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary-container/10 border border-primary/20 text-primary shadow-xs">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0 text-primary">
            <Icon name="eco" size="md" filled />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md font-bold text-on-surface">
              Impacto Ambiental
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Ahorraste 14.8 kg CO₂ con tus canjes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
