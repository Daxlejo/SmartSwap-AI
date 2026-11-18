import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ProposeMeetingDto, proposeMeetingSchema } from './dto/propose-meeting.dto';
import { SendMessageDto, sendMessageSchema } from './dto/send-message.dto';
import { HandoffDto } from './handoff.mapper';
import { HandoffService } from './handoff.service';

@ApiTags('Swap handoff')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Get(':id/handoff')
  @ApiOperation({
    summary: 'Read the delivery chat of a swap: messages, agreed date and place, and when it completes by itself (participants only)',
  })
  @ApiResponse({ status: 200, description: 'Delivery chat of the swap' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Swap not found or not a participant' })
  async getHandoff(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<HandoffDto> {
    return this.handoffService.getHandoff(currentUser.sub, id);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a text message (up to 500 characters) to the delivery chat of a confirmed swap' })
  @ApiResponse({ status: 201, description: 'Delivery chat with the new message' })
  @ApiResponse({ status: 400, description: 'Empty or longer than 500 characters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Swap not found or not a participant' })
  @ApiResponse({ status: 409, description: 'The swap is not waiting for its handoff' })
  async sendMessage(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ): Promise<HandoffDto> {
    return this.handoffService.sendMessage(currentUser.sub, id, dto);
  }

  @Post(':id/meeting')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propose the date and place of the handoff; the other participants have to confirm it' })
  @ApiResponse({ status: 200, description: 'Delivery chat with the proposed date and place' })
  @ApiResponse({ status: 400, description: 'Invalid date or place' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Swap not found or not a participant' })
  @ApiResponse({ status: 409, description: 'The swap is not waiting for its handoff' })
  async proposeMeeting(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proposeMeetingSchema)) dto: ProposeMeetingDto,
  ): Promise<HandoffDto> {
    return this.handoffService.proposeMeeting(currentUser.sub, id, dto);
  }

  @Post(':id/meeting/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm the proposed date and place; once everyone confirms, the handoff period starts' })
  @ApiResponse({ status: 200, description: 'Delivery chat after the confirmation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Swap not found or not a participant' })
  @ApiResponse({ status: 409, description: 'No date proposed, or the swap is not waiting for its handoff' })
  async confirmMeeting(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<HandoffDto> {
    return this.handoffService.confirmMeeting(currentUser.sub, id);
  }
}
