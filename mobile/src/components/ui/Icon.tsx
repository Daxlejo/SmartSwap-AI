import clsx from 'clsx';

export interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ariaLabel?: string;
}

const sizeClasses: Record<NonNullable<IconProps['size']>, string> = {
  xs: 'text-[14px]',
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
  xl: 'text-[32px]',
};

export const Icon = ({ name, className, filled = false, size = 'md', ariaLabel }: IconProps) => {
  return (
    <span
      className={clsx(
        'material-symbols-outlined select-none leading-none',
        sizeClasses[size],
        filled && 'icon-filled',
        className,
      )}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {name}
    </span>
  );
};
