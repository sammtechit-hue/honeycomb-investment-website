import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { InvestorModule } from './investor/investor.module';
import { InvestmentModule } from './investment/investment.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    InvestorModule,
    InvestmentModule,
    AuditLogModule,
    NotificationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
