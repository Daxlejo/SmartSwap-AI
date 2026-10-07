import React from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  subLabel?: React.ReactNode;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      subLabel,
      leftIcon,
      rightIcon,
      onRightIconClick,
      error,
      helperText,
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {(label || subLabel) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={inputId} className="font-label-md text-label-md text-on-surface">
                {label}
              </label>
            )}
            {subLabel}
          </div>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-outline">
              <Icon name={leftIcon} size="md" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={clsx(
              'w-full h-[52px] bg-surface-container-low text-on-surface rounded-2xl font-body-md text-body-md',
              'placeholder:text-on-surface-variant/70 transition-all duration-150',
              'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30',
              leftIcon ? 'pl-11' : 'pl-4',
              rightIcon ? 'pr-11' : 'pr-4',
              error && 'ring-2 ring-error/50 bg-error-container/20',
              disabled && 'opacity-60 cursor-not-allowed',
              className,
            )}
            {...rest}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center">
              {onRightIconClick ? (
                <button
                  type="button"
                  onClick={onRightIconClick}
                  aria-label="Input action"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon name={rightIcon} size="md" />
                </button>
              ) : (
                <div className="text-outline pointer-events-none">
                  <Icon name={rightIcon} size="md" />
                </div>
              )}
            </div>
          )}
        </div>
        {error ? (
          <span className="font-body-sm text-body-sm text-error">{error}</span>
        ) : helperText ? (
          <span className="font-body-sm text-body-sm text-on-surface-variant">{helperText}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
