import React from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options: SelectOption[];
  placeholder: string;
  leftIcon?: string;
  error?: string;
  helperText?: string;
}

/** Native select (best picker on phones) styled like the Input component. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, leftIcon, error, helperText, id, className, disabled, ...rest }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="font-label-md text-label-md text-on-surface">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-outline">
              <Icon name={leftIcon} size="md" />
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className={clsx(
              'w-full h-[52px] appearance-none bg-surface-container-low text-on-surface rounded-2xl',
              'font-body-md text-body-md pr-11 transition-all duration-150',
              'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30',
              leftIcon ? 'pl-11' : 'pl-4',
              error && 'ring-2 ring-error/50 bg-error-container/20',
              disabled && 'opacity-60 cursor-not-allowed',
              className,
            )}
            {...rest}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 flex items-center pointer-events-none text-outline">
            <Icon name="expand_more" size="md" />
          </div>
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

Select.displayName = 'Select';
