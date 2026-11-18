import type { ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

/** "Artículos parecidos": semantic suggestions shown when a text search found nothing. */
export const SimilarItemsSection = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="similar-items-title" data-testid="similar-items" className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="similar-items-title" className="font-label-lg text-label-lg font-bold text-on-surface">
          {t('explore.similarTitle')}
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t('explore.similarHint')}</p>
      </div>
      {children}
    </section>
  );
};
