import type { ReactNode } from 'react';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Element at the end of the title row, e.g. the notification bell on Home. */
  trailing?: ReactNode;
}

/**
 * Title of the four main tabs (Home, Explore, Swaps, Profile). It is part of the
 * content and scrolls with it: those tabs have no fixed top bar and no back
 * arrow, the BottomNav is how people move between them. Long titles wrap.
 */
export const ScreenHeader = ({ title, subtitle, trailing }: ScreenHeaderProps) => (
  <header className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1 flex flex-col gap-1">
      <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface break-words">{title}</h1>
      {subtitle && <p className="font-body-md text-body-md text-on-surface-variant">{subtitle}</p>}
    </div>
    {trailing}
  </header>
);
