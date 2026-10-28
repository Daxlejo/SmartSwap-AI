import type { LocalePreference } from '@/services/storage/preferencesStorage';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Human-readable relative time ("hace 5 min" / "5 min. ago") in the active app locale.
 * Dates older than four weeks fall back to a short calendar date.
 */
export const formatRelativeTime = (
  dateInput: string | Date | undefined,
  locale: LocalePreference,
  now: Date = new Date(),
): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });

  if (!date || Number.isNaN(date.getTime())) {
    return rtf.format(0, 'second');
  }

  const diffSec = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));

  if (diffSec < MINUTE) return rtf.format(0, 'second');
  if (diffSec < HOUR) return rtf.format(-Math.floor(diffSec / MINUTE), 'minute');
  if (diffSec < DAY) return rtf.format(-Math.floor(diffSec / HOUR), 'hour');
  if (diffSec < WEEK) return rtf.format(-Math.floor(diffSec / DAY), 'day');
  if (diffSec < 4 * WEEK) return rtf.format(-Math.floor(diffSec / WEEK), 'week');

  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};
