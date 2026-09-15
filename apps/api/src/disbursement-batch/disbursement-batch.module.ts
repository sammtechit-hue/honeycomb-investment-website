import { Module } from '@nestjs/common';
import { DisbursementBatchService } from './disbursement-batch.service';
import { DisbursementBatchController } from './disbursement-batch.controller';

@Module({
  providers: [DisbursementBatchService],
  controllers: [DisbursementBatchController]
})
export class DisbursementBatchModule {}
