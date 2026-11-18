import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HANDOFF_DAYS = 5;

/** Days after the agreed date before a swap completes by itself. */
const handoffDaysSchema = z.coerce.number().int().min(0).max(60);

/** Reads SWAP_HANDOFF_DAYS (5 by default; 0 lets a demo complete a swap as soon as its date passes). */
export const handoffDays = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = env.SWAP_HANDOFF_DAYS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_HANDOFF_DAYS;
  const parsed = handoffDaysSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_HANDOFF_DAYS;
};

/** When a swap whose date and place were agreed completes by itself: the agreed date plus the handoff days. */
export const autoCompleteAt = (meetingAt: Date, days: number = handoffDays()): Date =>
  new Date(meetingAt.getTime() + days * DAY_MS);
