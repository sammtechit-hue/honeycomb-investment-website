import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { InvestorModule } from './investor/investor.module';
import { InvestmentModule } from './investment/investment.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationModule } from './notification/notification.module';
import { ProjectModule } from './project/project.module';
import { NomineeModule } from './nominee/nominee.module';
import { InvestorBankAccountModule } from './investor-bank-account/investor-bank-account.module';
import { InvestorKycDocumentModule } from './investor-kyc-document/investor-kyc-document.module';
import { DisbursementBatchModule } from './disbursement-batch/disbursement-batch.module';
import { DisbursementItemModule } from './disbursement-item/disbursement-item.module';
import { WithdrawalRequestModule } from './withdrawal-request/withdrawal-request.module';
import { IncomingPaymentModule } from './incoming-payment/incoming-payment.module';
import { ReferralModule } from './referral/referral.module';
import { RefferalModule } from './refferal/refferal.module';
import { RoiCalculatorLeadModule } from './roi-calculator-lead/roi-calculator-lead.module';
import { RefferalCodeModule } from './refferal-code/refferal-code.module';

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    InvestorModule,
    InvestmentModule,
    AuditLogModule,
    NotificationModule,
    ProjectModule,
    NomineeModule,
    InvestorBankAccountModule,
    InvestorKycDocumentModule,
    DisbursementBatchModule,
    DisbursementItemModule,
    WithdrawalRequestModule,
    IncomingPaymentModule,
    ReferralModule,
    RefferalModule,
    RoiCalculatorLeadModule,
    RefferalCodeModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
