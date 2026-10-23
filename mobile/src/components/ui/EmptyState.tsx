import React from 'react';
import { Icon } from './Icon';

export interface EmptyStateProps {
  iconName: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px] rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest">
      <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant mb-4 shadow-xs">
        <Icon name={iconName} size="xl" />
      </div>
      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
        {title}
      </h3>
      {description && (
        <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-[280px]">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
