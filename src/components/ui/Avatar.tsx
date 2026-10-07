import clsx from 'clsx';
import { Icon } from './Icon';

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
  return (
    <div className={clsx('relative inline-flex shrink-0 select-none', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={clsx(
            'rounded-full object-cover bg-surface-container-high',
            sizeClasses[size],
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold font-headline-sm',
            sizeClasses[size],
          )}
        >
          {alt.slice(0, 2).toUpperCase()}
        </div>
      )}
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center ring-2 ring-surface shadow-xs"
          title="Usuario verificado"
        >
          <Icon name="check" size="xs" />
        </span>
      )}
    </div>
  );
};
