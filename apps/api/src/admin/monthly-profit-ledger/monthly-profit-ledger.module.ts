import { Module } from '@nestjs/common';
import { MonthlyProfitLedgerController } from './monthly-profit-ledger.controller';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';

@Module({
  controllers: [MonthlyProfitLedgerController],
  providers: [MonthlyProfitLedgerService]
})
export class MonthlyProfitLedgerModule {}
