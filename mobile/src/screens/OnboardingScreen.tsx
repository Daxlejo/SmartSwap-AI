import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { preferencesStorage } from '@/services/storage/preferencesStorage';
import { ApiError } from '@/services/http/apiClient';
import { ExampleRing } from '@/components/ExampleRing';
import { ProfilePhotoPicker } from '@/components/ProfilePhotoPicker';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const STEP_COUNT = 4;
type OnboardingStep = 0 | 1 | 2 | 3;
const PHOTO_STEP = 3 as const;

/**
 * First-run introduction, shown once per user right after creating the account:
 * what SmartSwap is and that you publish what you no longer use, how the swap ring
 * works (a static example), how a proposal closes, and an optional profile photo.
 * "Skip" is always visible and every way out marks it as seen for this user.
 */
export const OnboardingScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, isAuthenticated, uploadAvatarReal } = useApp();
  const [step, setStep] = useState<OnboardingStep>(0);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const examplePeople = useMemo(
    () =>
      [
        {
          id: currentUser?.id ?? 'example-you',
          name: currentUser?.name ?? t('onboarding.ring.you'),
          avatarUrl: currentUser?.avatarUrl,
          gives: { name: t('onboarding.ring.item1'), category: 'Deportes' },
        },
        { id: 'example-camilo', name: 'Camilo', gives: { name: t('onboarding.ring.item2'), category: 'Música' } },
        { id: 'example-laura', name: 'Laura', gives: { name: t('onboarding.ring.item3'), category: 'Hogar' } },
      ] as const,
    [currentUser?.id, currentUser?.name, currentUser?.avatarUrl, t],
  );

  // The session is restored in the background: wait for the user instead of bouncing to login
  if (!currentUser) return isAuthenticated ? null : <Navigate to="/login" replace />;

  const finish = () => {
    preferencesStorage.markOnboardingDone(currentUser.id);
    navigate('/home', { replace: true });
  };

  const savePhotoAndFinish = async () => {
    if (!pendingAvatar || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await uploadAvatarReal(pendingAvatar);
      finish();
    } catch (err) {
      setSaveError(err instanceof ApiError && err.message ? err.message : t('profile.photoUploadError'));
    } finally {
      setIsSaving(false);
    }
  };

  const slides: Record<Exclude<OnboardingStep, 3>, { icon: string; title: string; body: string }> = {
    0: { icon: 'cycle', title: t('onboarding.what.title'), body: t('onboarding.what.body') },
    1: { icon: 'diversity_3', title: t('onboarding.ring.title'), body: t('onboarding.ring.body') },
    2: { icon: 'handshake', title: t('onboarding.propose.title'), body: t('onboarding.propose.body') },
  };

  return (
    <div className="flex flex-col flex-1 px-margin pt-4">
      {/* Progress and the always-visible way out */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step + 1}
          aria-label={t('onboarding.progress', { current: step + 1, total: STEP_COUNT })}
          className="flex items-center gap-2"
        >
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <span
              key={index}
              className={clsx(
                'h-2.5 rounded-full motion-safe:transition-all',
                index === step ? 'w-8 bg-primary' : index < step ? 'w-2.5 bg-primary' : 'w-2.5 bg-outline/40',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finish}
          data-testid="onboarding-skip"
          className="min-h-12 min-w-12 px-3 -mr-3 font-label-lg text-label-lg font-bold text-primary rounded-full hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      <div className="flex flex-col flex-1 gap-5" aria-live="polite">
        {step !== PHOTO_STEP ? (
          <>
            {step === 1 ? (
              <ExampleRing people={examplePeople} viewerId={currentUser.id} />
            ) : (
              <div className="mx-auto w-28 h-28 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon name={slides[step].icon} size="xl" />
              </div>
            )}
            <div className="flex flex-col gap-2 text-center">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {slides[step].title}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">{slides[step].body}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2 text-center">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {t('onboarding.photo.title')}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">{t('onboarding.photo.body')}</p>
            </div>
            <ProfilePhotoPicker
              savedSrc={currentUser.avatarUrl}
              pendingSrc={pendingAvatar}
              onPicked={setPendingAvatar}
              name={currentUser.name}
              seed={currentUser.id}
            />
            {saveError && (
              <p role="alert" className="font-body-md text-body-md text-error text-center">
                {saveError}
              </p>
            )}
          </>
        )}
      </div>

      <div aria-hidden="true" className="h-6 shrink-0" />
      <div className="sticky bottom-0 mt-auto -mx-margin px-margin pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-surface-container-high flex flex-col gap-2">
        {step !== PHOTO_STEP ? (
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep((step - 1) as OnboardingStep)}
              >
                {t('onboarding.back')}
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              rightIcon="arrow_forward"
              data-testid="onboarding-next"
              onClick={() => setStep((step + 1) as OnboardingStep)}
            >
              {t('onboarding.next')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              data-testid="onboarding-not-now"
              onClick={finish}
            >
              {t('onboarding.photo.notNow')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              isLoading={isSaving}
              disabled={!pendingAvatar}
              onClick={() => void savePhotoAndFinish()}
            >
              {t('onboarding.photo.save')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
