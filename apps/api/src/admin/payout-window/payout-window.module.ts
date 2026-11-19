import { Module } from '@nestjs/common';
import { PayoutWindowService } from './payout-window.service';
import { PayoutWindowController } from './payout-window.controller';

@Module({
  providers: [PayoutWindowService],
  controllers: [PayoutWindowController]
})
export class PayoutWindowModule {}
