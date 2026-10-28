import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  QueryNotificationsDto,
  queryNotificationsSchema,
} from './dto/query-notifications.dto';
import {
  NotificationDto,
  NotificationWithUnreadCountDto,
} from './mappers/notification.mapper';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications with unread count' })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Filter by unread notifications only',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum items to return (default 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications and total unread count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listUserNotifications(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query(new ZodValidationPipe(queryNotificationsSchema))
    query?: QueryNotificationsDto,
  ): Promise<{ items: NotificationDto[]; unreadCount: number }> {
    return this.notificationsService.listUserNotifications(
      currentUser.sub,
      query,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count object',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(currentUser.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread notifications as read (POST)' })
  @ApiResponse({
    status: 200,
    description: 'Updated count and remaining unread count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsReadPost(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<{ updatedCount: number; unreadCount: number }> {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read (PATCH)' })
  @ApiResponse({
    status: 200,
    description: 'Updated count and remaining unread count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsReadPatch(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<{ updatedCount: number; unreadCount: number }> {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read (PATCH)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated notification DTO and remaining unread count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsReadPatch(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<NotificationWithUnreadCountDto> {
    return this.notificationsService.markAsRead(currentUser.sub, id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read (POST)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated notification DTO and remaining unread count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsReadPost(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<NotificationWithUnreadCountDto> {
    return this.notificationsService.markAsRead(currentUser.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.notificationsService.deleteNotification(currentUser.sub, id);
  }
}
