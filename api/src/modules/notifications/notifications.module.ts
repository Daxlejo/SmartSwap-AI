import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationMapper } from './mappers/notification.mapper';

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationMapper],
  exports: [NotificationsService, NotificationMapper],
})
export class NotificationsModule {}
