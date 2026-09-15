import { Module } from '@nestjs/common';
import { DisbursementBatchController } from './disbursement-batch.controller';
import { DisbursementBatchService } from './disbursement-batch.service';

@Module({
  controllers: [DisbursementBatchController],
  providers: [DisbursementBatchService]
})
export class DisbursementBatchModule {}
