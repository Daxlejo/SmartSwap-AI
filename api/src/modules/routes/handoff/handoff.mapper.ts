import { Prisma, RouteStatus } from '@prisma/client';
import { RouteMapper, SwapRouteStatusDto } from '../mappers/route.mapper';
import { autoCompleteAt } from './handoff.config';

/** What the delivery chat reads of a route: its participants and their handoff answers. */
export const HANDOFF_ROUTE_INCLUDE = {
  steps: {
    orderBy: { stepOrder: 'asc' as const },
    include: {
      user: { select: { id: true, name: true, initials: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.SwapRouteInclude;

export type HandoffRoute = Prisma.SwapRouteGetPayload<{ include: typeof HANDOFF_ROUTE_INCLUDE }>;

export const HANDOFF_MESSAGE_INCLUDE = {
  sender: { select: { id: true, name: true } },
} satisfies Prisma.SwapMessageInclude;

export type HandoffMessage = Prisma.SwapMessageGetPayload<{ include: typeof HANDOFF_MESSAGE_INCLUDE }>;

export interface HandoffParticipantDto {
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  /** Agreed to the proposed date and place. */
  meetingConfirmed: boolean;
  /** Pressed "Complete swap". */
  deliveryConfirmed: boolean;
}

export interface HandoffMessageDto {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface HandoffMeetingDto {
  at: string;
  place: string;
  proposedById: string | null;
  /** When the last participant confirmed; null while someone still has to. */
  confirmedAt: string | null;
}

export interface HandoffDto {
  routeId: string;
  code: string;
  status: SwapRouteStatusDto;
  participants: HandoffParticipantDto[];
  meeting: HandoffMeetingDto | null;
  handoffDays: number;
  /** When the swap completes by itself: set once the date is agreed, unless someone reported a problem. */
  autoCompleteAt: string | null;
  /** A participant reported a problem: the swap no longer completes by itself. */
  problem: { reportedAt: string; reportedById: string | null; reason: string | null } | null;
  completedAt: string | null;
  messages: HandoffMessageDto[];
}

export class HandoffMapper {
  static toDto(route: HandoffRoute, messages: HandoffMessage[], days: number): HandoffDto {
    const meeting =
      route.meetingAt && route.meetingPlace
        ? {
            at: route.meetingAt.toISOString(),
            place: route.meetingPlace,
            proposedById: route.meetingProposedById ?? null,
            confirmedAt: route.meetingConfirmedAt ? route.meetingConfirmedAt.toISOString() : null,
          }
        : null;

    return {
      routeId: route.id,
      code: route.code,
      status: RouteMapper.mapRouteStatus(route.status),
      participants: route.steps.map((step) => ({
        userId: step.userId,
        name: step.user?.name ?? 'Usuario SmartSwap',
        initials: step.user?.initials ?? 'SU',
        avatarUrl: step.user?.avatarUrl ?? null,
        meetingConfirmed: Boolean(step.meetingConfirmed),
        deliveryConfirmed: Boolean(step.deliveryConfirmed),
      })),
      meeting,
      handoffDays: days,
      autoCompleteAt:
        route.status === RouteStatus.CONFIRMED &&
        route.meetingAt &&
        route.meetingConfirmedAt &&
        !route.problemReportedAt
          ? autoCompleteAt(route.meetingAt, days).toISOString()
          : null,
      problem: route.problemReportedAt
        ? {
            reportedAt: route.problemReportedAt.toISOString(),
            reportedById: route.problemReportedById ?? null,
            reason: route.problemReason ?? null,
          }
        : null,
      completedAt: route.completedAt ? route.completedAt.toISOString() : null,
      messages: messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        senderName: message.sender?.name ?? 'Usuario SmartSwap',
        body: message.body,
        createdAt: new Date(message.createdAt).toISOString(),
      })),
    };
  }
}
