import { Module } from '@nestjs/common';
import { AdminNotificationService } from './admin-notification.service';
import { AdminNotificationController } from './admin-notification.controller';

@Module({
  providers: [AdminNotificationService],
  controllers: [AdminNotificationController]
})
export class AdminNotificationModule {}
