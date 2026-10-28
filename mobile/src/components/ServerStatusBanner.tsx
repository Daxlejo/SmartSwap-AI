import clsx from 'clsx';
import { useServerStatus } from '@/hooks/useServerStatus';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from './ui/Icon';

/**
 * Thin banner shown while the API is waking up (Render free tier cold start)
 * or unreachable, so slow first loads don't look like a broken app.
 */
export const ServerStatusBanner = () => {
  const status = useServerStatus();
  const { t } = useTranslation();

  if (status !== 'waking' && status !== 'offline') {
    return null;
  }

  const isWaking = status === 'waking';

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'w-full flex items-center gap-2 px-margin py-2 font-label-sm text-label-sm font-semibold shrink-0',
        isWaking
          ? 'bg-secondary-fixed text-on-secondary-fixed'
          : 'bg-error-container text-on-error-container',
      )}
    >
      <Icon
        name={isWaking ? 'hourglass_top' : 'cloud_off'}
        size="xs"
        className={isWaking ? 'animate-pulse' : undefined}
      />
      <span>{isWaking ? t('serverStatus.waking') : t('serverStatus.offline')}</span>
    </div>
  );
};
