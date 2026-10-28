import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Animation sequence phases:
  // Phase 1 (0-200ms): screen background fades in from transparent
  // Phase 2 (200-600ms): logo scales from 0.5 to 1 with bounce (cubic-bezier spring)
  // Phase 3 (600-900ms): wordmark slides up from +20px and fades in
  // Phase 4 (900-1200ms): subtitle fades in
  // Phase 5 (1200-1800ms): brief hold
  // Phase 6 (1800-2200ms): entire screen fades out (opacity 0, transition 400ms)
  // Phase 7 (2200ms+): navigate to /login
  const [phase, setPhase] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  const handleSkip = () => {
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setReducedMotion(true);
      setPhase(4);
      const timer = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 800);
      return () => clearTimeout(timer);
    }

    const t2 = setTimeout(() => setPhase(2), 200);
    const t3 = setTimeout(() => setPhase(3), 600);
    const t4 = setTimeout(() => setPhase(4), 900);
    const t5 = setTimeout(() => setPhase(5), 1200);
    const t6 = setTimeout(() => setPhase(6), 1800);
    const t7 = setTimeout(() => {
      setPhase(7);
      navigate('/login', { replace: true });
    }, 2200);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
    };
  }, [navigate]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSkip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleSkip();
      }}
      aria-label={t('splash.aria')}
      style={{ '--color-primary': '#00685f', backgroundColor: '#00685f' } as React.CSSProperties}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between min-h-[100dvh] w-full bg-primary px-margin py-8 select-none overflow-hidden cursor-pointer ${
        reducedMotion ? '' : phase >= 6 ? 'animate-screen-out' : 'animate-screen-in'
      }`}
    >
      <style>{`
        @keyframes screenFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes screenFadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes logoSpringBounce {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          75% {
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes wordmarkSlideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes subtitleFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        .animate-screen-in {
          animation: screenFadeIn 200ms ease-out forwards;
        }
        .animate-screen-out {
          animation: screenFadeOut 400ms ease-in-out forwards;
        }
        .animate-logo-bounce {
          animation: logoSpringBounce 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-wordmark-slide {
          animation: wordmarkSlideUp 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-subtitle-fade {
          animation: subtitleFadeIn 300ms ease-out forwards;
        }
      `}</style>

      {/* Top spacer to balance layout */}
      <div className="w-full h-8" aria-hidden="true" />

      {/* Center: SmartSwap Brand Identity */}
      <div className="flex flex-col items-center text-center">
        {/* SmartSwap 80px circular logo with sync icon */}
        <div
          className={`w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl mb-6 ${
            reducedMotion ? '' : phase >= 2 ? 'animate-logo-bounce' : 'opacity-0'
          }`}
        >
          <Icon name="sync" size="xl" className="text-primary text-[40px]" filled />
        </div>

        {/* Wordmark */}
        <h1
          className={`font-headline-xl text-headline-xl font-bold text-white tracking-tight ${
            reducedMotion ? '' : phase >= 3 ? 'animate-wordmark-slide' : 'opacity-0'
          }`}
        >
          SmartSwap
        </h1>

        {/* Subtitle */}
        <p
          className={`font-body-md text-body-md text-white/70 mt-2 font-medium max-w-[280px] ${
            reducedMotion ? '' : phase >= 4 ? 'animate-subtitle-fade' : 'opacity-0'
          }`}
        >
          {t('splash.subtitle')}
        </p>
      </div>

      {/* Bottom: Version tag */}
      <div
        className={`font-label-sm text-label-sm text-white/50 tracking-wider font-semibold uppercase pb-safe ${
          reducedMotion ? '' : phase >= 4 ? 'animate-subtitle-fade' : 'opacity-0'
        }`}
      >
        v2.4
      </div>
    </div>
  );
};
export default SplashScreen;
