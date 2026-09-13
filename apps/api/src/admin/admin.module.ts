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
import { WithdrawalRequestModule } from './withdrawal-request/withdrawal-request.module';
import { InvestorKycDocumentModule } from './investor-kyc-document/investor-kyc-document.module';
import { MonthlyProfitLedgerModule } from './monthly-profit-ledger/monthly-profit-ledger.module';

@Module({
  imports: [InvestorModule, InvestmentModule, MonthlyRateSettingModule, AuditLogModule, DisbursementBatchModule, DisbursementItemModule, IncomingPaymentModule, InvestmentDocumentModule, ProjectModule, WithdrawalRequestModule, InvestorKycDocumentModule, MonthlyProfitLedgerModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
