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
    <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
      <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center text-text-muted mb-4">
        <Icon name={iconName} className="w-8 h-8" />
      </div>
      <h3 className="text-h3 font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-body text-text-secondary mb-6 max-w-[280px]">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
