import { Module } from '@nestjs/common';
import { WithdrawalRequestController } from './withdrawal-request.controller';
import { WithdrawalRequestService } from './withdrawal-request.service';

@Module({
  controllers: [WithdrawalRequestController],
  providers: [WithdrawalRequestService]
})
export class WithdrawalRequestModule {}
