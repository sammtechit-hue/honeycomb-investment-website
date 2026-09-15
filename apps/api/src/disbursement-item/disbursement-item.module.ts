import { Module } from '@nestjs/common';
import { DisbursementItemController } from './disbursement-item.controller';
import { DisbursementItemService } from './disbursement-item.service';

@Module({
  controllers: [DisbursementItemController],
  providers: [DisbursementItemService]
})
export class DisbursementItemModule {}
