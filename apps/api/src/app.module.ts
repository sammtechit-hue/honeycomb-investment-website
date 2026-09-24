import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
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
import { InvestmentDocumentModule } from './investment-document/investment-document.module';
import { MonthlyProfitLedgerModule } from './monthly-profit-ledger/monthly-profit-ledger.module';
import { MonthlyRateSettingModule } from './monthly-rate-setting/monthly-rate-setting.module';

@Module({
  imports: [
    // Loads apps/api/.env, then packages/db/.env (where DATABASE_URL lives
    // for the prisma CLI), and validates the result (config/env.ts) before
    // anything else is constructed — a bad/missing secret fails boot, not a
    // request. Paths are relative to apps/api, the cwd of every api script.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../packages/db/.env'],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
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
    RefferalCodeModule,
    InvestmentDocumentModule,
    MonthlyProfitLedgerModule,
    MonthlyRateSettingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
