import React from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'primary-subtle'
    | 'secondary'
    | 'secondary-subtle'
    | 'tertiary-subtle'
    | 'surface'
    | 'outline'
    | 'success'
    | 'warning'
    | 'error'
    | 'info';
  icon?: string;
  iconFilled?: boolean;
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  primary: 'bg-primary text-on-primary',
  'primary-subtle': 'bg-primary-fixed text-on-primary-fixed',
  secondary: 'bg-secondary-container text-on-secondary-container',
  'secondary-subtle': 'bg-secondary-fixed text-on-secondary-fixed',
  'tertiary-subtle': 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/20',
  surface: 'bg-surface-container-high text-on-surface-variant',
  outline: 'border border-outline-variant text-on-surface bg-transparent',
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-tertiary-fixed text-on-tertiary-fixed',
};

export const Badge = ({
  children,
  variant = 'surface',
  icon,
  iconFilled = false,
  className,
}: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold tracking-wide select-none',
        variantClasses[variant],
        className,
      )}
    >
      {icon && <Icon name={icon} size="xs" filled={iconFilled} />}
      <span>{children}</span>
    </span>
  );
};
