import React from 'react';
import { Icon } from './Icon';

export interface FormErrorAlertProps {
  message: string;
  details?: string[];
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
  testId?: string;
}

/**
 * Form-level error notice. It is focusable (tabIndex -1) and assertive so `useRevealOnError`
 * can scroll to it and move focus there; the field errors below each input repeat the cause.
 */
export const FormErrorAlert = React.forwardRef<HTMLDivElement, FormErrorAlertProps>(
  ({ message, details = [], onDismiss, dismissLabel, className, testId }, ref) => (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      data-testid={testId}
      className={`p-3.5 rounded-2xl bg-error-container/25 border border-error/40 text-error flex items-start gap-2.5 shadow-2xs scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-error ${className ?? ''}`}
    >
      <Icon name="error" size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-label-md text-label-md font-bold">{message}</p>
        {details.length > 0 && (
          <ul className="mt-1 list-disc list-inside font-body-sm text-body-sm space-y-0.5">
            {details.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="w-11 h-11 -m-2.5 shrink-0 text-error/80 hover:text-error rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <Icon name="close" size="xs" />
        </button>
      )}
    </div>
  ),
);

FormErrorAlert.displayName = 'FormErrorAlert';
