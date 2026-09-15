import { Module } from '@nestjs/common';
import { MonthlyRateSettingController } from './monthly-rate-setting.controller';
import { MonthlyRateSettingService } from './monthly-rate-setting.service';

@Module({
  controllers: [MonthlyRateSettingController],
  providers: [MonthlyRateSettingService]
})
export class MonthlyRateSettingModule {}
