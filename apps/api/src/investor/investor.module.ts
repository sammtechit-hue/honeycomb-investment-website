import { Module } from '@nestjs/common';
import { InvestorService } from './investor.service';
import { InvestorController } from './investor.controller';

@Module({
  providers: [InvestorService],
  controllers: [InvestorController]
})
export class InvestorModule {}
