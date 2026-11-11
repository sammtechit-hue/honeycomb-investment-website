import { Module } from '@nestjs/common';
import { DisbursementBatchController } from './disbursement-batch.controller';
import { DisbursementBatchService } from './disbursement-batch.service';
import { DisbursementItemModule } from '../disbursement-item/disbursement-item.module';

@Module({
  controllers: [DisbursementBatchController],
  providers: [DisbursementBatchService],
  imports: [DisbursementItemModule]
})
export class DisbursementBatchModule {}
