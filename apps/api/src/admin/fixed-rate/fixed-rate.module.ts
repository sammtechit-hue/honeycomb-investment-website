import { Module } from '@nestjs/common';
import { FixedRateService } from './fixed-rate.service';
import { FixedRateController } from './fixed-rate.controller';

@Module({
  providers: [FixedRateService],
  controllers: [FixedRateController]
})
export class FixedRateModule {}
