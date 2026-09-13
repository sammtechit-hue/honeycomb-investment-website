import { Module } from '@nestjs/common';
import { DisbursementItemService } from './disbursement-item.service';
import { DisbursementItemController } from './disbursement-item.controller';

@Module({
  providers: [DisbursementItemService],
  controllers: [DisbursementItemController]
})
export class DisbursementItemModule {}
