import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { avatarDataUri } from '@/utils/avatarArt';

export interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-12 h-12 text-[16px]',
  xl: 'w-20 h-20 text-[24px]',
};

export const Avatar = ({
  src,
  alt,
  size = 'md',
  verified = false,
  className,
}: AvatarProps) => {
  const { t } = useTranslation();
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  // A missing or broken photo falls back to the illustration generated from the name.
  const resolvedSrc = src && src !== failedSrc ? src : avatarDataUri(alt);

  return (
    <div className={clsx('relative inline-flex shrink-0 select-none', className)}>
      <img
        src={resolvedSrc}
        alt={alt}
        onError={() => setFailedSrc(src)}
        className={clsx(
          'rounded-full object-cover bg-surface-container-high',
          sizeClasses[size],
        )}
      />
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center ring-2 ring-surface shadow-xs"
          title={t('nav.verifiedUser')}
        >
          <Icon name="check" size="xs" />
        </span>
      )}
    </div>
  );
};
