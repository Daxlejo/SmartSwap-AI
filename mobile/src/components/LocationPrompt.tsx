import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

/**
 * Invites accounts created before locations existed to add their municipality.
 * Renders nothing for logged-out visitors and for users who already have one.
 */
export const LocationPrompt = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useApp();

  if (!isAuthenticated || currentUser?.municipalityCode) {
    return null;
  }

  return (
    <section
      aria-label={t('location.prompt.title')}
      className="flex items-start gap-3 p-4 rounded-2xl bg-secondary-fixed/40 border border-secondary/20"
    >
      <Icon name="location_on" size="lg" className="text-secondary shrink-0 mt-0.5" />
      <div className="flex flex-col gap-2 min-w-0">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {t('location.prompt.title')}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('location.prompt.description')}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          className="self-start"
          onClick={() => navigate('/profile', { state: { editLocation: true } })}
        >
          {t('location.prompt.action')}
        </Button>
      </div>
    </section>
  );
};
