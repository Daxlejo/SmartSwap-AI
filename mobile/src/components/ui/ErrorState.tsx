import React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTranslation } from '@/hooks/useTranslation';

export interface ErrorStateProps {
  /** Overrides the default "could not load" sentence. */
  message?: string;
  onRetry: () => void;
}

/** A failed load: what happened and one way out. Never shows made-up data instead. */
export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 p-6 text-center rounded-2xl border border-error/30 bg-error-container/20"
    >
      <Icon name="cloud_off" size="xl" className="text-error" />
      <p className="font-body-md text-body-md text-on-surface max-w-[280px]">
        {message ?? t('states.loadError')}
      </p>
      <Button variant="outline" size="md" leftIcon="refresh" onClick={onRetry}>
        {t('states.retry')}
      </Button>
    </div>
  );
};
