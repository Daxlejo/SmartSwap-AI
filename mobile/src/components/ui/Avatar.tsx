import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { avatarColorFor, initialsFor } from '@/utils/avatarIdentity';

export interface AvatarProps {
  src?: string;
  alt: string;
  /** Name used for the initials when there is no photo; defaults to `alt`. */
  name?: string;
  /** Keeps the colour stable per person (user id); defaults to the name. */
  seed?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-[14px]',
  md: 'w-10 h-10 text-[15px]',
  lg: 'w-12 h-12 text-[17px]',
  xl: 'w-20 h-20 text-[28px]',
};

export const Avatar = ({
  src,
  alt,
  name,
  seed,
  size = 'md',
  verified = false,
  className,
}: AvatarProps) => {
  const { t } = useTranslation();
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const showPhoto = Boolean(src) && src !== failedSrc;
  const displayName = name ?? alt;
  const initials = initialsFor(displayName);

  return (
    <div className={clsx('relative inline-flex shrink-0 select-none', className)}>
      {showPhoto ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailedSrc(src)}
          className={clsx('rounded-full object-cover bg-surface-container-high', sizeClasses[size])}
        />
      ) : (
        // No photo, or a broken one: initials on a colour that stays the same for this person
        <span
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          data-testid="avatar-initials"
          className={clsx(
            'rounded-full flex items-center justify-center font-bold leading-none text-white',
            sizeClasses[size],
          )}
          style={{ backgroundColor: avatarColorFor(seed || displayName || 'smartswap') }}
        >
          {initials || <Icon name="person" size="sm" />}
        </span>
      )}
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
