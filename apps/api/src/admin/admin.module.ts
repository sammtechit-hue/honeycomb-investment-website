import { Module } from '@nestjs/common';
import { InvestorModule } from './investor/investor.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InvestmentModule } from './investment/investment.module';
import { MonthlyRateSettingModule } from './monthly-rate-setting/monthly-rate-setting.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { DisbursementBatchModule } from './disbursement-batch/disbursement-batch.module';
import { DisbursementItemModule } from './disbursement-item/disbursement-item.module';
import { IncomingPaymentModule } from './incoming-payment/incoming-payment.module';
import { InvestmentDocumentModule } from './investment-document/investment-document.module';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [InvestorModule, InvestmentModule, MonthlyRateSettingModule, AuditLogModule, DisbursementBatchModule, DisbursementItemModule, IncomingPaymentModule, InvestmentDocumentModule, ProjectModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
