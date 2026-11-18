import { apiClient } from '@/services/http/apiClient';

/** Longest chat message the API takes (api/src/modules/routes/handoff/dto/send-message.dto.ts). */
export const MAX_MESSAGE_LENGTH = 500;

/** How often the open chat asks for new messages (no websockets). */
export const HANDOFF_POLL_MS = 5000;

export interface HandoffParticipant {
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  meetingConfirmed: boolean;
  deliveryConfirmed: boolean;
}

export interface HandoffMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface HandoffMeeting {
  at: string;
  place: string;
  proposedById: string | null;
  confirmedAt: string | null;
}

/** The delivery chat of a swap as GET /routes/:id/handoff answers it. */
export interface Handoff {
  routeId: string;
  code: string;
  status: string;
  participants: HandoffParticipant[];
  meeting: HandoffMeeting | null;
  handoffDays: number;
  autoCompleteAt: string | null;
  messages: HandoffMessage[];
}

const path = (routeId: string, suffix: string) => `/routes/${encodeURIComponent(routeId)}/${suffix}`;

export const handoffService = {
  get(routeId: string): Promise<Handoff> {
    return apiClient.get<Handoff>(path(routeId, 'handoff'));
  },

  sendMessage(routeId: string, body: string): Promise<Handoff> {
    return apiClient.post<Handoff>(path(routeId, 'messages'), { body });
  },

  /** `at` is an ISO date and time; the other participants have to confirm it. */
  proposeMeeting(routeId: string, at: string, place: string): Promise<Handoff> {
    return apiClient.post<Handoff>(path(routeId, 'meeting'), { at, place });
  },

  confirmMeeting(routeId: string): Promise<Handoff> {
    return apiClient.post<Handoff>(path(routeId, 'meeting/confirm'));
  },
};
