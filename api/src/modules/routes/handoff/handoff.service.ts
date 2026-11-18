import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RouteStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProposeMeetingDto } from './dto/propose-meeting.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { autoCompleteAt, handoffDays } from './handoff.config';
import {
  HANDOFF_MESSAGE_INCLUDE,
  HANDOFF_ROUTE_INCLUDE,
  HandoffDto,
  HandoffMapper,
  HandoffRoute,
} from './handoff.mapper';

/** The chat keeps the latest messages; a handoff is agreed in far fewer. */
const MAX_MESSAGES = 200;

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Delivery chat of a confirmed swap: text messages between its participants (the app polls
 * `getHandoff`, no websockets) and the date and place everyone has to confirm.
 */
@Injectable()
export class HandoffService {
  constructor(private readonly prisma: PrismaService) {}

  async getHandoff(userId: string, routeId: string): Promise<HandoffDto> {
    const route = await this.findForParticipant(this.prisma, userId, routeId);
    return this.toDto(this.prisma, route);
  }

  async sendMessage(userId: string, routeId: string, dto: SendMessageDto): Promise<HandoffDto> {
    return this.prisma.$transaction(async (tx) => {
      const route = await this.findForParticipant(tx, userId, routeId);
      this.assertHandoffOpen(route);
      await tx.swapMessage.create({
        data: { routeId: route.id, senderId: userId, body: dto.body },
      });
      return this.toDto(tx, route);
    });
  }

  /**
   * Proposes (or changes) the date and place: everyone has to confirm again, except the
   * proposer, who agrees by proposing.
   */
  async proposeMeeting(userId: string, routeId: string, dto: ProposeMeetingDto): Promise<HandoffDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockRoute(tx, routeId);
      const route = await this.findForParticipant(tx, userId, routeId);
      this.assertHandoffOpen(route);

      await tx.swapRouteStep.updateMany({
        where: { routeId: route.id },
        data: { meetingConfirmed: false },
      });
      await tx.swapRouteStep.updateMany({
        where: { routeId: route.id, userId },
        data: { meetingConfirmed: true },
      });
      await tx.swapRoute.update({
        where: { id: route.id },
        data: {
          meetingAt: new Date(dto.at),
          meetingPlace: dto.place,
          meetingProposedById: userId,
          meetingConfirmedAt: null,
        },
      });

      const proposer = route.steps.find((step) => step.userId === userId)?.user?.name ?? 'Un participante';
      const others = this.participantIds(route).filter((id) => id !== userId);
      if (others.length > 0) {
        await tx.notification.createMany({
          data: others.map((uid) => ({
            userId: uid,
            type: 'HANDOFF_MEETING_PROPOSED',
            badge: 'Entrega',
            title: `Fecha y lugar propuestos para ${route.code}`,
            body: `${proposer} propuso entregar el ${this.formatDate(new Date(dto.at))} en ${dto.place}. Confírmalo en el chat de entrega.`,
            routeId: route.id,
          })),
        });
      }

      return this.toDto(tx, await this.findForParticipant(tx, userId, routeId));
    });
  }

  /** Agrees to the proposed date and place; when the last participant agrees, the handoff period starts. */
  async confirmMeeting(userId: string, routeId: string): Promise<HandoffDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockRoute(tx, routeId);
      const route = await this.findForParticipant(tx, userId, routeId);
      this.assertHandoffOpen(route);
      if (!route.meetingAt || !route.meetingPlace) {
        throw new ConflictException('Nobody has proposed a date and place yet');
      }
      if (route.meetingConfirmedAt) {
        return this.toDto(tx, route);
      }

      await tx.swapRouteStep.updateMany({
        where: { routeId: route.id, userId },
        data: { meetingConfirmed: true },
      });

      const everyoneAgreed = route.steps.every(
        (step) => step.userId === userId || step.meetingConfirmed,
      );
      if (everyoneAgreed) {
        await tx.swapRoute.update({
          where: { id: route.id },
          data: { meetingConfirmedAt: new Date() },
        });
        const closesOn = this.formatDate(autoCompleteAt(route.meetingAt, handoffDays()));
        await tx.notification.createMany({
          data: this.participantIds(route).map((uid) => ({
            userId: uid,
            type: 'HANDOFF_MEETING_CONFIRMED',
            badge: 'Entrega',
            title: `Entrega de ${route.code} acordada`,
            body: `Todos confirmaron la fecha y el lugar. Si nadie reporta un problema, el canje se completa automáticamente el ${closesOn}.`,
            routeId: route.id,
          })),
        });
      }

      return this.toDto(tx, await this.findForParticipant(tx, userId, routeId));
    });
  }

  /** The route, only for its participants: anyone else gets the same 404 as a missing route. */
  private async findForParticipant(db: Db, userId: string, routeId: string): Promise<HandoffRoute> {
    const route = await db.swapRoute.findUnique({
      where: { id: routeId.trim() },
      include: HANDOFF_ROUTE_INCLUDE,
    });
    if (!route || !route.steps.some((step) => step.userId === userId)) {
      throw new NotFoundException(`SwapRoute "${routeId}" not found`);
    }
    return route;
  }

  /** The chat only takes messages and dates while the swap waits for its handoff. */
  private assertHandoffOpen(route: HandoffRoute): void {
    if (route.status !== RouteStatus.CONFIRMED) {
      throw new ConflictException('The delivery chat is only open while the swap waits for its handoff');
    }
  }

  private async toDto(db: Db, route: HandoffRoute): Promise<HandoffDto> {
    const latest = await db.swapMessage.findMany({
      where: { routeId: route.id },
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES,
      include: HANDOFF_MESSAGE_INCLUDE,
    });
    return HandoffMapper.toDto(route, [...latest].reverse(), handoffDays());
  }

  /** Serializes concurrent proposals and confirmations of the same route. */
  private async lockRoute(tx: Prisma.TransactionClient, routeId: string): Promise<void> {
    await tx.swapRoute.updateMany({
      where: { id: routeId.trim() },
      data: { updatedAt: new Date() },
    });
  }

  private participantIds(route: HandoffRoute): string[] {
    return Array.from(new Set(route.steps.map((step) => step.userId)));
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
}
