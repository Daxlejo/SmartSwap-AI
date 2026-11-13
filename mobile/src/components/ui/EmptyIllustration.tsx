import React from 'react';

export type EmptyIllustrationName = 'routes' | 'inbox' | 'sent' | 'bell' | 'search';

interface EmptyIllustrationProps {
  name: EmptyIllustrationName;
  className?: string;
}

/**
 * Flat brand illustrations for empty states. Teal (`text-primary`) carries the subject and
 * orange (`text-secondary`) the accent, so both themes follow the palette tokens.
 */
export const EmptyIllustration: React.FC<EmptyIllustrationProps> = ({ name, className }) => (
  <svg
    viewBox="0 0 160 120"
    className={className ?? 'w-40 h-[120px]'}
    role="presentation"
    aria-hidden="true"
    focusable="false"
  >
    <ellipse cx="80" cy="100" rx="52" ry="8" className="fill-surface-container-high" />
    <circle cx="80" cy="56" r="44" className="fill-surface-container-high" />
    {name === 'routes' && (
      <g fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M80 26a30 30 0 0 1 26 15" className="stroke-primary" />
        <path d="M106 71a30 30 0 0 1-52 0" className="stroke-primary" strokeDasharray="2 9" />
        <path d="M54 41a30 30 0 0 1 26-15" className="stroke-primary" strokeDasharray="2 9" />
        <path d="M100 38l8 4-2-9" className="stroke-primary" />
        <circle cx="80" cy="26" r="8" className="fill-surface stroke-primary" />
        <circle cx="106" cy="71" r="8" className="fill-surface stroke-secondary" />
        <circle cx="54" cy="71" r="8" className="fill-surface stroke-primary" />
      </g>
    )}
    {name === 'inbox' && (
      <g strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 52l10-16h40l10 16v26a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z" className="fill-surface stroke-primary" />
        <path d="M50 52h24a6 6 0 0 0 12 0h24" fill="none" className="stroke-primary" />
        <path d="M80 26v-8m-14 12l-6-6m34 6l6-6" fill="none" className="stroke-secondary" />
      </g>
    )}
    {name === 'sent' && (
      <g strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 52l10-16h40l10 16v26a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z" className="fill-surface stroke-primary" />
        <path d="M50 52h20m20 0h20" fill="none" className="stroke-primary" />
        <path d="M80 70V40m-9 9l9-9 9 9" fill="none" className="stroke-secondary" />
      </g>
    )}
    {name === 'bell' && (
      <g strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 76V58a22 22 0 0 1 44 0v18l6 6H52z" className="fill-surface stroke-primary" />
        <path d="M72 90a8 8 0 0 0 16 0" fill="none" className="stroke-primary" />
        <circle cx="102" cy="34" r="6" className="fill-secondary stroke-secondary" />
      </g>
    )}
    {name === 'search' && (
      <g strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="74" cy="52" r="20" className="fill-surface stroke-primary" />
        <path d="M89 67l18 18" fill="none" className="stroke-secondary" />
        <path d="M66 52h16" fill="none" className="stroke-primary" />
      </g>
    )}
  </svg>
);
