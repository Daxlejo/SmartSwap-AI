import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/http/apiClient';
import { handoffService, type Handoff } from '@/services/routes/handoff.service';
import {
  deliveryChatPath,
  isChatOpen,
  isDeliveryChatPath,
  meetingState,
  toLocalInputValue,
} from '@/utils/deliveryChat';

const participant = (userId: string, meetingConfirmed: boolean) => ({
  userId,
  name: userId,
  initials: userId.slice(0, 2).toUpperCase(),
  avatarUrl: null,
  meetingConfirmed,
  deliveryConfirmed: false,
});

const handoff = (overrides: Partial<Handoff> = {}): Handoff => ({
  routeId: 'r1',
  code: 'SW-1000',
  status: 'CONFIRMED',
  participants: [participant('ana', false), participant('beto', false)],
  meeting: null,
  handoffDays: 5,
  autoCompleteAt: null,
  messages: [],
  ...overrides,
});

const proposedByAna = {
  at: '2026-11-22T20:00:00.000Z',
  place: 'Parque Nariño',
  proposedById: 'ana',
  confirmedAt: null,
};

describe('meetingState', () => {
  it('is none until someone proposes a date and place', () => {
    expect(meetingState(handoff(), 'ana')).toBe('none');
  });

  it('asks the participants who have not confirmed, and lets the others wait', () => {
    const proposed = handoff({
      meeting: proposedByAna,
      participants: [participant('ana', true), participant('beto', false)],
    });
    expect(meetingState(proposed, 'beto')).toBe('awaitingMe');
    expect(meetingState(proposed, 'ana')).toBe('awaitingOthers');
  });

  it('is agreed once everyone confirmed', () => {
    const agreed = handoff({ meeting: { ...proposedByAna, confirmedAt: '2026-11-18T01:00:00.000Z' } });
    expect(meetingState(agreed, 'beto')).toBe('agreed');
  });
});

describe('delivery chat helpers', () => {
  it('opens the chat only while the swap waits for its handoff', () => {
    expect(isChatOpen(handoff())).toBe(true);
    expect(isChatOpen(handoff({ status: 'COMPLETED' }))).toBe(false);
    expect(isChatOpen(handoff({ status: 'CANCELLED' }))).toBe(false);
  });

  it('builds and recognises the chat path of a route', () => {
    expect(deliveryChatPath('r-1')).toBe('/swap/route/r-1/chat');
    expect(isDeliveryChatPath('/swap/route/r-1/chat')).toBe(true);
    expect(isDeliveryChatPath('/swap/route/r-1')).toBe(false);
  });

  it('writes a local date in the datetime-local format', () => {
    expect(toLocalInputValue(new Date(2026, 10, 22, 9, 5))).toBe('2026-11-22T09:05');
  });
});

describe('handoffService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('polls, writes and confirms through the central API client', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(handoff());
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(handoff());

    await handoffService.get('r1');
    await handoffService.sendMessage('r1', 'Hola');
    await handoffService.proposeMeeting('r1', proposedByAna.at, 'Parque Nariño');
    await handoffService.confirmMeeting('r1');

    expect(get).toHaveBeenCalledWith('/routes/r1/handoff');
    expect(post).toHaveBeenNthCalledWith(1, '/routes/r1/messages', { body: 'Hola' });
    expect(post).toHaveBeenNthCalledWith(2, '/routes/r1/meeting', { at: proposedByAna.at, place: 'Parque Nariño' });
    expect(post).toHaveBeenNthCalledWith(3, '/routes/r1/meeting/confirm');
  });
});
