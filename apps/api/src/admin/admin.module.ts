import { Module } from '@nestjs/common';
import { InvestorModule } from './investor/investor.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InvestmentModule } from './investment/investment.module';
import { MonthlyRateSettingModule } from './monthly-rate-setting/monthly-rate-setting.module';

@Module({
  imports: [InvestorModule, InvestmentModule, MonthlyRateSettingModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
