import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { InvestorModule } from './investor/investor.module';
import { InvestmentModule } from './investment/investment.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationModule } from './notification/notification.module';
import { ProjectModule } from './project/project.module';
import { NomineeModule } from './nominee/nominee.module';
import { InvestorBankAccountModule } from './investor-bank-account/investor-bank-account.module';

@Module({
  imports: [
    AdminModule,
    InvestorModule,
    InvestmentModule,
    AuditLogModule,
    NotificationModule,
    ProjectModule,
    NomineeModule,
    InvestorBankAccountModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
