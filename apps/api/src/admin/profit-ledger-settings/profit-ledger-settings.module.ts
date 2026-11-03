import { Module } from '@nestjs/common';
import { ProfitLedgerSettingsService } from './profit-ledger-settings.service';
import { ProfitLedgerSettingsController } from './profit-ledger-settings.controller';

@Module({
  providers: [ProfitLedgerSettingsService],
  controllers: [ProfitLedgerSettingsController]
})
export class ProfitLedgerSettingsModule {}
