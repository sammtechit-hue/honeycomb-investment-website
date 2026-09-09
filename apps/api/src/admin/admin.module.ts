import { Module } from '@nestjs/common';
import { InvestorModule } from './investor/investor.module';

@Module({
  imports: [InvestorModule]
})
export class AdminModule {}
