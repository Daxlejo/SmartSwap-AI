import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PhotoPickError,
  pickPhotos,
  usesNativePicker,
  type PhotoPickFailure,
  type PhotoSource,
} from '@/services/media/photoPicker';
import { canOpenSettings, openSettings } from '@/services/device/appSettings';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

export interface PhotoSourceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** How many more photos fit (1 for a profile photo, up to 4 for an item). */
  remaining: number;
  /** Receives the chosen photos; the sheet closes once they arrive. */
  onFiles: (files: File[]) => void;
  /** Labels the hidden file input used in the browser. */
  inputLabel: string;
  /** Test id of the hidden file input. */
  inputTestId?: string;
}

/**
 * Asks where the photos come from: the camera or the gallery (several at once,
 * up to `remaining`). In the Android app it uses the native camera and the
 * system photo picker and explains a refused camera permission, with a button
 * to Settings. In the browser both options open a plain file input. The input is
 * always mounted (without `capture`, which forced the camera on Android) so tests
 * and the UI audit can attach files to it.
 */
export const PhotoSourceSheet = ({
  isOpen,
  onClose,
  remaining,
  onFiles,
  inputLabel,
  inputTestId,
}: PhotoSourceSheetProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [failure, setFailure] = useState<Exclude<PhotoPickFailure, 'cancelled'> | null>(null);
  const [busy, setBusy] = useState<PhotoSource | null>(null);

  const close = () => {
    setFailure(null);
    onClose();
  };

  const deliver = (files: File[]) => {
    setFailure(null);
    onClose();
    if (files.length > 0) onFiles(files.slice(0, remaining));
  };

  const choose = async (source: PhotoSource) => {
    setFailure(null);
    if (!usesNativePicker()) {
      inputRef.current?.click();
      return;
    }
    setBusy(source);
    try {
      deliver(await pickPhotos(source, source === 'camera' ? 1 : remaining));
    } catch (error) {
      const reason = error instanceof PhotoPickError ? error.reason : 'failed';
      if (reason === 'cancelled') close();
      else setFailure(reason);
    } finally {
      setBusy(null);
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    deliver(files);
  };

  const options: { source: PhotoSource; icon: string; label: string; hint: string }[] = [
    { source: 'camera', icon: 'photo_camera', label: t('photoSource.camera'), hint: t('photoSource.cameraHint') },
    {
      source: 'gallery',
      icon: 'photo_library',
      label: t('photoSource.gallery'),
      hint: t('photoSource.galleryHint', { count: remaining }),
    },
  ];

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={remaining > 1}
        onChange={handleInput}
        className="hidden"
        aria-label={inputLabel}
        data-testid={inputTestId}
      />
      <BottomSheet isOpen={isOpen} onClose={close} title={t('photoSource.title')}>
        <div className="flex flex-col gap-3 pt-4">
          {options.map((option) => (
            <button
              key={option.source}
              type="button"
              disabled={busy !== null}
              onClick={() => void choose(option.source)}
              className="w-full min-h-[64px] flex items-center gap-4 px-4 py-3 rounded-2xl bg-surface-container-low border border-surface-container-high text-left hover:bg-surface-container active:scale-[0.99] transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="w-12 h-12 shrink-0 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                <Icon
                  name={busy === option.source ? 'progress_activity' : option.icon}
                  size="lg"
                  className={busy === option.source ? 'animate-spin' : undefined}
                />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">{option.label}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{option.hint}</span>
              </span>
            </button>
          ))}

          {failure && (
            <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-error-container text-on-error-container p-4">
              <p className="font-body-md text-body-md">{t(`photoSource.errors.${failure}`)}</p>
              {failure === 'denied' && canOpenSettings() && (
                <Button
                  variant="outline"
                  size="md"
                  leftIcon="settings"
                  onClick={() => {
                    openSettings('app').catch(() => setFailure('failed'));
                  }}
                >
                  {t('photoSource.openSettings')}
                </Button>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
};
