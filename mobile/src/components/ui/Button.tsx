import React from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-container shadow-md active:scale-[0.98]',
  secondary:
    'bg-secondary-container text-on-secondary hover:opacity-90 shadow-md active:scale-[0.98]',
  tonal:
    'bg-surface-container-high hover:bg-surface-container-highest text-on-surface active:scale-[0.98]',
  outline:
    'border border-outline-variant bg-transparent hover:bg-surface-container-low text-on-surface active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-surface-container text-on-surface active:scale-95',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 font-label-sm text-label-sm font-semibold rounded-xl',
  md: 'min-h-[44px] px-4 py-2 font-label-md text-label-md font-semibold rounded-xl',
  lg: 'min-h-[52px] px-6 py-3 font-label-lg text-label-lg font-bold rounded-full',
  icon: 'w-11 h-11 rounded-full flex items-center justify-center p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      className,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 select-none transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {isLoading ? (
          <Icon name="progress_activity" className="animate-spin text-current" size="sm" />
        ) : (
          leftIcon && <Icon name={leftIcon} size={size === 'lg' ? 'md' : 'sm'} />
        )}
        {children}
        {!isLoading && rightIcon && (
          <Icon name={rightIcon} size={size === 'lg' ? 'md' : 'sm'} />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
