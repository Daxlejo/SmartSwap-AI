import { z } from 'zod';

/** Longest delivery chat message: enough to agree on a handoff, short enough to stay a chat. */
export const MAX_MESSAGE_LENGTH = 500;

export const sendMessageSchema = z
  .object({
    body: z
      .string({ required_error: 'body is required' })
      .trim()
      .min(1, 'body cannot be empty')
      .max(MAX_MESSAGE_LENGTH, `body must be at most ${MAX_MESSAGE_LENGTH} characters long`),
  })
  .strict();

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
