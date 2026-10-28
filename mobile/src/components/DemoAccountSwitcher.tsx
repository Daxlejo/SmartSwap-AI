import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { env } from '@/config/env';
import { DEMO_ACCOUNTS, type DemoAccount } from '@/config/demoAccounts';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ApiError } from '@/services/http/apiClient';
import { Icon } from './ui/Icon';

/**
 * One-tap sign-in as any seeded demo user, to show a multi-person circular swap live.
 * Renders nothing unless VITE_DEMO_PASSWORD is configured.
 */
export const DemoAccountSwitcher = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, isAuthenticated, loginWithEmail, logout } = useApp();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!env.isDemoMode || !env.demoPassword) {
    return null;
  }
  const demoPassword = env.demoPassword;

  const activeEmail = isAuthenticated ? currentUser?.email?.toLowerCase() : undefined;

  const handleSwitch = async (account: DemoAccount) => {
    if (switchingTo || account.email === activeEmail) return;
    setError(null);
    setSwitchingTo(account.email);
    try {
      if (isAuthenticated) {
        logout();
      }
      await loginWithEmail(account.email, demoPassword);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : t('demo.failed'));
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <section
      aria-label={t('demo.title')}
      className="rounded-2xl border border-dashed border-secondary/40 bg-secondary-fixed/30 p-3.5 space-y-2.5"
    >
      <div className="flex items-center gap-1.5 text-on-surface">
        <Icon name="switch_account" size="sm" className="text-secondary" />
        <h2 className="font-label-md text-label-md font-bold">{t('demo.title')}</h2>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{t('demo.description')}</p>

      <div className="grid grid-cols-4 gap-2">
        {DEMO_ACCOUNTS.map((account) => {
          const isActive = account.email === activeEmail;
          const isSwitching = switchingTo === account.email;
          return (
            <button
              key={account.email}
              type="button"
              onClick={() => handleSwitch(account)}
              disabled={Boolean(switchingTo)}
              aria-pressed={isActive}
              aria-label={t('demo.signInAs', { name: account.name })}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-xl p-2 transition-all active:scale-95 disabled:opacity-60',
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
              )}
            >
              <span
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center font-label-md text-label-md font-bold',
                  isActive ? 'bg-on-primary/20' : 'bg-primary-container text-on-primary-container',
                )}
              >
                {isSwitching ? <Icon name="progress_activity" size="sm" className="animate-spin" /> : account.initials}
              </span>
              <span className="font-label-sm text-label-sm font-semibold">{account.name}</span>
              <span
                className={clsx(
                  'font-label-sm text-[10px]',
                  isActive ? 'text-on-primary/80' : 'text-on-surface-variant',
                )}
              >
                {account.city}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="font-body-sm text-body-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
};
