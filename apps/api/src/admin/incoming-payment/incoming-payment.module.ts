import { Module } from '@nestjs/common';
import { IncomingPaymentController } from './incoming-payment.controller';
import { IncomingPaymentService } from './incoming-payment.service';

@Module({
  controllers: [IncomingPaymentController],
  providers: [IncomingPaymentService]
})
export class IncomingPaymentModule {}
