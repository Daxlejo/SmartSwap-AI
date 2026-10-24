import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { findRoutes } from '@/services/swapService';

// Item thumbnails from mock assets
import bikeImg from '@/assets/item-bike.svg';
import ballImg from '@/assets/item-ball.svg';
import headphonesImg from '@/assets/item-headphones.svg';
import cameraImg from '@/assets/item-camera.svg';

const MESSAGES = [
  'Analizando inventarios...',
  'Buscando coincidencias cruzadas...',
  'Calculando rutas óptimas...',
  'Verificando valores estimados...',
  '¡Ruta encontrada!',
];

const FLOW_STEPS = [
  { user: 'Tú', itemImg: bikeImg, itemName: 'Bicicleta' },
  { user: 'Carlos', itemImg: ballImg, itemName: 'Balón' },
  { user: 'Laura', itemImg: headphonesImg, itemName: 'Audífonos' },
  { user: 'Sofía', itemImg: cameraImg, itemName: 'Cámara' },
];

export const SearchingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const haveId = searchParams.get('have') || 'item-bike';
  const wantId = searchParams.get('want') || 'item-camera';

  // Animation phases: 1 (0-600ms), 2 (600-2500ms), 3 (2500ms+)
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [matchPercent, setMatchPercent] = useState(0);
  const hasNavigated = useRef(false);

  const handleNavigate = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    navigate('/swap/results?have=' + haveId + '&want=' + wantId);
  }, [navigate, haveId, wantId]);

  // Phase scheduling and pre-warming findRoutes
  useEffect(() => {
    findRoutes(haveId, wantId).catch(() => {});

    // Kick off progress bar animation (2500ms)
    const progressTimer = setTimeout(() => {
      setProgressWidth(100);
    }, 50);

    // Phase 2 start at 600ms
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 600);

    // Message interval every 800ms up to 2400ms
    const msgTimer1 = setTimeout(() => setMessageIndex(1), 800);
    const msgTimer2 = setTimeout(() => setMessageIndex(2), 1600);
    const msgTimer3 = setTimeout(() => setMessageIndex(3), 2400);

    // Phase 3 trigger at 2500ms
    const phase3Timer = setTimeout(() => {
      setPhase(3);
      setMessageIndex(4);
    }, 2500);

    // Auto-navigate after user has time to view the completed circuit (4500ms)
    const autoNavTimer = setTimeout(() => {
      handleNavigate();
    }, 4500);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(phase2Timer);
      clearTimeout(msgTimer1);
      clearTimeout(msgTimer2);
      clearTimeout(msgTimer3);
      clearTimeout(phase3Timer);
      clearTimeout(autoNavTimer);
    };
  }, [haveId, wantId, handleNavigate]);

  // Match counter animation (0 to 98% in Phase 3)
  useEffect(() => {
    if (phase === 3) {
      const start = 0;
      const end = 98;
      const duration = 750;
      const startTime = performance.now();

      const animateCounter = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(start + (end - start) * easeOut);
        setMatchPercent(currentVal);

        if (progress < 1) {
          requestAnimationFrame(animateCounter);
        }
      };

      requestAnimationFrame(animateCounter);
    }
  }, [phase]);

  const isPhase3 = phase === 3;

  return (
    <div className="flex flex-col items-center justify-between h-full min-h-[580px] w-full max-w-[390px] mx-auto px-margin py-3 text-center overflow-hidden select-none animate-fade-in relative">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.3); }
          70% { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes dashFlow {
          from { stroke-dashoffset: 704; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseSuccess {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(26, 122, 74, 0.45);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 0 10px rgba(26, 122, 74, 0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 600ms ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-dash-flow {
          animation: dashFlow 7s linear infinite;
        }
        .animate-spin-slow {
          animation: spinSlow 3.5s linear infinite;
        }
        .animate-pulse-success {
          animation: pulseSuccess 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Header section: Entrance Title */}
      <div className="flex flex-col items-center animate-slide-up shrink-0 pt-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high mb-2 shadow-2xs">
          <Icon name="cyclone" size="xs" filled className="text-primary animate-spin-slow" />
          <span className="font-label-sm text-[11px] text-primary font-bold uppercase tracking-wider">
            Algoritmo Circular SmartSwap
          </span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          Analizando Rutas de Canje...
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 max-w-[280px]">
          Conectando usuarios para cerrar el circuito sin dinero
        </p>
      </div>

      {/* Hero Circular Diagram: 280px container with 112px radius through 4 nodes */}
      <div className="relative w-[280px] h-[280px] my-auto flex items-center justify-center shrink-0">
        {/* Connecting SVG Circular Arcs */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 280 280"
          aria-hidden="true"
        >
          {/* Track background */}
          <circle
            cx="140"
            cy="140"
            r="112"
            fill="none"
            stroke="#00685f"
            strokeOpacity="0.18"
            strokeWidth="2.5"
          />

          {/* Animated Flow Track */}
          <circle
            cx="140"
            cy="140"
            r="112"
            fill="none"
            stroke="#00685f"
            strokeOpacity="0.6"
            strokeWidth={isPhase3 ? '3.5' : '2.5'}
            strokeDasharray={isPhase3 ? 'none' : '8 6'}
            className={isPhase3 ? 'transition-all duration-700' : 'animate-dash-flow'}
          />

          {/* Phase 3 glowing completed circuit */}
          {isPhase3 && (
            <circle
              cx="140"
              cy="140"
              r="112"
              fill="none"
              stroke="#1a7a4a"
              strokeOpacity="0.85"
              strokeWidth="3.5"
              className="transition-all duration-700"
            />
          )}
        </svg>

        {/* Center Node: SmartSwap logo / sync icon -> pulses with success in Phase 3 */}
        <div className="relative z-20 flex flex-col items-center justify-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all duration-500 ${
              isPhase3
                ? 'bg-[#1a7a4a] text-on-primary animate-pulse-success'
                : 'bg-primary text-on-primary ring-4 ring-primary/20'
            }`}
          >
            <Icon
              name={isPhase3 ? 'check' : 'sync'}
              size="md"
              className={isPhase3 ? 'text-[24px] font-bold' : 'animate-spin-slow'}
            />
          </div>
          <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider mt-1 text-on-surface-variant">
            {isPhase3 ? '¡Conectado!' : 'SmartSwap'}
          </span>
        </div>

        {/* Node 0 (Top): Tú (Alex) — Current user with primary ring */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          <div
            className="flex flex-col items-center"
            style={{
              animation: 'popIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 600ms both',
            }}
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-md flex items-center justify-center">
                <span className="font-headline-sm text-headline-sm font-bold text-primary">AM</span>
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-surface-container-high px-1.5 py-0.2 rounded-full font-label-sm text-[10px] text-primary font-bold shadow-xs whitespace-nowrap border border-surface-container-highest">
                $780
              </span>
            </div>
            <span className="font-label-sm text-[11px] text-on-surface font-bold mt-2 truncate max-w-[76px] text-center">
              Tú (Alex)
            </span>
          </div>
        </div>

        {/* Node 1 (Right): Carlos V. — Secondary node */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-20">
          <div
            className="flex flex-col items-center"
            style={{
              animation: 'popIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 900ms both',
            }}
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-surface-container-high shadow-md flex items-center justify-center">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  CV
                </span>
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-surface-container-high px-1.5 py-0.2 rounded-full font-label-sm text-[10px] text-on-surface-variant font-bold shadow-xs whitespace-nowrap border border-surface-container-highest">
                $120
              </span>
            </div>
            <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold mt-2 truncate max-w-[76px] text-center">
              Carlos V.
            </span>
          </div>
        </div>

        {/* Node 2 (Bottom): Laura G. — Secondary node */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          <div
            className="flex flex-col items-center"
            style={{
              animation: 'popIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 1200ms both',
            }}
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-surface-container-high shadow-md flex items-center justify-center">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  LG
                </span>
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-surface-container-high px-1.5 py-0.2 rounded-full font-label-sm text-[10px] text-on-surface-variant font-bold shadow-xs whitespace-nowrap border border-surface-container-highest">
                $390
              </span>
            </div>
            <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold mt-2 truncate max-w-[76px] text-center">
              Laura G.
            </span>
          </div>
        </div>

        {/* Node 3 (Left): Sofía C. — Secondary node */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-20">
          <div
            className="flex flex-col items-center"
            style={{
              animation: 'popIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 1500ms both',
            }}
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-surface-container-high shadow-md flex items-center justify-center">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  SC
                </span>
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-surface-container-high px-1.5 py-0.2 rounded-full font-label-sm text-[10px] text-on-surface-variant font-bold shadow-xs whitespace-nowrap border border-surface-container-highest">
                $790
              </span>
            </div>
            <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold mt-2 truncate max-w-[76px] text-center">
              Sofía C.
            </span>
          </div>
        </div>
      </div>

      {/* Middle & Reveal Info Section */}
      <div className="w-full flex flex-col items-center gap-2 shrink-0 py-1">
        {isPhase3 ? (
          <div className="w-full flex flex-col items-center gap-2 animate-slide-up">
            {/* Reveal Badges & Percentage */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a7a4a]/12 border border-[#1a7a4a]/30 text-[#1a7a4a] shadow-2xs">
                <Icon name="verified" size="xs" filled />
                <span className="font-label-sm text-label-sm font-bold">
                  ¡Ruta Circular Encontrada! #SR-8492
                </span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Icon name="auto_awesome" size="xs" />
                <span className="font-label-sm text-label-sm font-bold">
                  {matchPercent}% coincidencia
                </span>
              </div>
            </div>

            {/* Sequential flow indicators: Tú -> Carlos -> Laura -> Sofía with SVG item thumbnails */}
            <div className="flex items-center justify-between w-full max-w-[340px] px-3 py-2 bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 shadow-xs">
              {FLOW_STEPS.map((step, idx) => (
                <React.Fragment key={step.user}>
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface-container p-1 border border-surface-container-high/50 shrink-0">
                      <img
                        src={step.itemImg}
                        alt={step.itemName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-label-sm text-[11px] text-on-surface font-semibold mt-1 truncate max-w-[50px] text-center">
                      {step.user}
                    </span>
                  </div>
                  {idx < FLOW_STEPS.length - 1 && (
                    <Icon
                      name="arrow_forward"
                      size="xs"
                      className="text-primary font-bold shrink-0 mb-3"
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[44px]">
            <p className="font-body-md text-body-md text-on-surface-variant font-medium animate-pulse">
              {MESSAGES[messageIndex]}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Section: Progress Bar & CTA Button */}
      <div className="w-full flex flex-col items-center gap-3 shrink-0 pt-1 pb-2">
        {/* Progress Bar (0 to 100% over 2500ms) */}
        <div className="w-full max-w-xs bg-surface-container-high rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-[2500ms] ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Bottom CTA Button */}
        {isPhase3 ? (
          <div className="w-full max-w-xs animate-slide-up">
            <Button variant="primary" size="lg" fullWidth onClick={handleNavigate}>
              <span>Ver Cadena de Ruta Completa (4 Pasos) →</span>
            </Button>
          </div>
        ) : (
          <div className="h-[52px] flex items-center justify-center">
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
              Sincronizando con 1,420 inventarios activos...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
