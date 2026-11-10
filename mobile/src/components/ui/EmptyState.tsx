import React from 'react';
import { Icon } from './Icon';
import { EmptyIllustration, type EmptyIllustrationName } from './EmptyIllustration';

export interface EmptyStateProps {
  /** Brand illustration; when omitted the `iconName` circle is shown instead. */
  illustration?: EmptyIllustrationName;
  iconName?: string;
  /** One sentence that says what is empty and what to do. */
  title: string;
  description?: string;
  /** The single action that gets the user out of the empty state. */
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  iconName,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest">
      {illustration ? (
        <EmptyIllustration name={illustration} className="w-40 h-[120px] mb-2" />
      ) : (
        <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant mb-4 shadow-xs">
          <Icon name={iconName ?? 'inbox'} size="xl" />
        </div>
      )}
      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2 max-w-[280px]">
        {title}
      </h3>
      {description && (
        <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-[280px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
