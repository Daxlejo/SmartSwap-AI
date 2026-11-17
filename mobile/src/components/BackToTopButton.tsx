import { useEffect, useState } from 'react';
import { Icon } from './ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Small round "back to top" arrow (44 px) in the bottom-right corner, above the
 * BottomNav. It only appears after the user scrolled more than one screen down.
 */
export const BackToTopButton = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;

  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="fixed inset-x-0 z-30 max-w-[390px] mx-auto px-margin flex justify-end pointer-events-none bottom-[calc(var(--bottom-nav-h)+var(--bottom-nav-overhang)+0.5rem+env(safe-area-inset-bottom,0px))]">
      <button
        type="button"
        data-testid="back-to-top"
        aria-label={t('explore.backToTop')}
        onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
        className="pointer-events-auto w-11 h-11 rounded-full bg-surface-container-lowest/95 text-primary border border-surface-container-high shadow-md flex items-center justify-center hover:bg-surface-container-low active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon name="arrow_upward" size="md" />
      </button>
    </div>
  );
};
