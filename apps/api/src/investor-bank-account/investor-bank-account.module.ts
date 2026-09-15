import { Module } from '@nestjs/common';
import { InvestorBankAccountController } from './investor-bank-account.controller';
import { InvestorBankAccountService } from './investor-bank-account.service';

@Module({
  controllers: [InvestorBankAccountController],
  providers: [InvestorBankAccountService]
})
export class InvestorBankAccountModule {}
