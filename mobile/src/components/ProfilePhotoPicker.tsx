import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { compressImageToDataUrl } from '@/utils/imageCompressor';
import { PhotoSourceSheet } from './PhotoSourceSheet';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

export interface ProfilePhotoPickerProps {
  /** Photo already saved on the profile. */
  savedSrc?: string;
  /** Photo picked here and not uploaded yet (square JPEG data URL). */
  pendingSrc: string | null;
  onPicked: (dataUrl: string) => void;
  name: string;
  /** User id, so the initials keep the person's colour. */
  seed?: string;
}

/**
 * Profile photo with the same "Take photo / Choose from gallery" sheet used when publishing.
 * The picked photo is compressed to a 512 px square and handed back for the caller to upload.
 */
export const ProfilePhotoPicker = ({
  savedSrc,
  pendingSrc,
  onPicked,
  name,
  seed,
}: ProfilePhotoPickerProps) => {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async ([file]: File[]) => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      onPicked(await compressImageToDataUrl(file, { maxDimension: 512, quality: 0.85, square: true }));
    } catch {
      setError(t('profile.photoReadError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPhoto = Boolean(pendingSrc ?? savedSrc);

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar src={pendingSrc ?? savedSrc} alt={name} name={name} seed={seed} size="xl" />
      <Button
        type="button"
        variant="outline"
        size="md"
        leftIcon="photo_camera"
        isLoading={isProcessing}
        onClick={() => setIsSheetOpen(true)}
        data-testid="profile-photo-button"
      >
        {hasPhoto ? t('profile.changePhoto') : t('profile.addPhoto')}
      </Button>
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        {t('profile.photoHint')}
      </p>
      {error && (
        <p role="alert" className="font-body-sm text-body-sm text-error text-center">
          {error}
        </p>
      )}
      <PhotoSourceSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        remaining={1}
        onFiles={(files) => void handleFiles(files)}
        inputLabel={t('profile.addPhoto')}
        inputTestId="avatar-gallery-input"
      />
    </div>
  );
};
