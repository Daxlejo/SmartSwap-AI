import type { Handoff } from '@/services/routes/handoff.service';

/** Where the delivery chat of a confirmed swap lives (a secondary screen: Android back returns to the route). */
export const deliveryChatPath = (routeId: string): string => `/swap/route/${encodeURIComponent(routeId)}/chat`;

export const isDeliveryChatPath = (pathname: string): boolean => /^\/swap\/route\/[^/]+\/chat$/.test(pathname);

/**
 * Where the date and place stand for the signed-in user:
 * - `none`: nobody proposed one yet;
 * - `awaitingMe`: proposed, and this user has not confirmed it;
 * - `awaitingOthers`: this user agreed, someone else has not;
 * - `agreed`: everyone confirmed, the handoff period is running.
 */
export type MeetingState = 'none' | 'awaitingMe' | 'awaitingOthers' | 'agreed';

export const meetingState = (
  handoff: Pick<Handoff, 'meeting' | 'participants'>,
  userId: string | undefined,
): MeetingState => {
  if (!handoff.meeting) return 'none';
  if (handoff.meeting.confirmedAt) return 'agreed';
  const own = handoff.participants.find((participant) => participant.userId === userId);
  return own && !own.meetingConfirmed ? 'awaitingMe' : 'awaitingOthers';
};

/** The chat is writable only while the swap waits for its handoff. */
export const isChatOpen = (handoff: Pick<Handoff, 'status'>): boolean =>
  handoff.status.toUpperCase() === 'CONFIRMED';

const pad = (value: number) => String(value).padStart(2, '0');

/** A local date and time in the format of `<input type="datetime-local">` (no seconds, no zone). */
export const toLocalInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const localeTag = (language: string) => (language === 'en' ? 'en-US' : 'es-CO');

/** "sábado, 22 de noviembre, 3:00 p. m." in the app language. */
export const formatMeetingDate = (iso: string, language: string): string =>
  new Intl.DateTimeFormat(localeTag(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

/** "sábado, 22 de noviembre" in the app language. */
export const formatDay = (iso: string, language: string): string =>
  new Intl.DateTimeFormat(localeTag(language), { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(iso),
  );

/** "3:05 p. m." for a message. */
export const formatMessageTime = (iso: string, language: string): string =>
  new Intl.DateTimeFormat(localeTag(language), { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
