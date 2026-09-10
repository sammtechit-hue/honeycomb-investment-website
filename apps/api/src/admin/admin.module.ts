import { Module } from '@nestjs/common';
import { InvestorModule } from './investor/investor.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InvestmentModule } from './investment/investment.module';

@Module({
  imports: [InvestorModule, InvestmentModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
