import clsx from 'clsx';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { LocationScopePreference } from '@/services/storage/preferencesStorage';
import { Chip } from './ui/Chip';
import { Icon } from './ui/Icon';

const OPTIONS: ReadonlyArray<{ id: LocationScopePreference; icon: string }> = [
  { id: 'nearby', icon: 'near_me' },
  { id: 'department', icon: 'map' },
  { id: 'country', icon: 'public' },
];

export interface LocationScopeSelectorProps {
  /** `chips` for filter bars; `cards` for a roomier selector with a hint under each option. */
  layout?: 'chips' | 'cards';
}

/**
 * Lets users choose how far from their municipality they want to see items and routes.
 * Renders nothing until the user has a registered municipality.
 */
export const LocationScopeSelector = ({ layout = 'chips' }: LocationScopeSelectorProps) => {
  const { t } = useTranslation();
  const { currentUser, isAuthenticated, locationScope, setLocationScope } = useApp();

  if (!isAuthenticated || !currentUser?.municipalityCode) {
    return null;
  }

  if (layout === 'chips') {
    return (
      <div
        role="radiogroup"
        aria-label={t('location.scope.title')}
        className="flex items-center gap-space-xs overflow-x-auto [scrollbar-width:none]"
      >
        {OPTIONS.map((option) => (
          <Chip
            key={option.id}
            role="radio"
            aria-checked={locationScope === option.id}
            active={locationScope === option.id}
            icon={option.icon}
            onClick={() => setLocationScope(option.id)}
            className="shrink-0"
          >
            {t(`location.scope.${option.id}`)}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('location.scope.title')}
      className="grid grid-cols-3 gap-2"
    >
      {OPTIONS.map((option) => {
        const isActive = locationScope === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setLocationScope(option.id)}
            className={clsx(
              'flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all border-2 active:scale-[0.98]',
              isActive
                ? 'border-primary bg-primary/5'
                : 'border-transparent bg-surface-container-low hover:bg-surface-container',
            )}
          >
            <Icon
              name={option.icon}
              size="md"
              className={isActive ? 'text-primary' : 'text-on-surface-variant'}
            />
            <span
              className={clsx(
                'font-label-lg text-label-lg font-bold',
                isActive ? 'text-primary' : 'text-on-surface',
              )}
            >
              {t(`location.scope.${option.id}`)}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t(`location.scope.${option.id}Hint`)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
