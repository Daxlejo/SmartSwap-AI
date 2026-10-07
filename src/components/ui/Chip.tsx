import React from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: string;
  iconFilled?: boolean;
  children: React.ReactNode;
}

export const Chip = ({
  active = false,
  icon,
  iconFilled = false,
  children,
  className,
  type = 'button',
  ...rest
}: ChipProps) => {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-label-md text-label-md select-none transition-all duration-150',
        'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'bg-primary-container text-on-primary-container shadow-xs font-bold'
          : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size="xs" filled={iconFilled} />}
      <span>{children}</span>
    </button>
  );
};
