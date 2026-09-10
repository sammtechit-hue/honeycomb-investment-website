import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { InvestorModule } from './investor/investor.module';
import { InvestmentModule } from './investment/investment.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AdminNotificationModule } from './admin-notification/admin-notification.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    AdminModule,
    InvestorModule,
    InvestmentModule,
    AuditLogModule,
    AdminNotificationModule,
    NotificationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
