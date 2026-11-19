import { Module } from '@nestjs/common';
import { BusinessSettingsService } from './business-settings.service';
import { BusinessSettingsController } from './business-settings.controller';

@Module({
  providers: [BusinessSettingsService],
  controllers: [BusinessSettingsController]
})
export class BusinessSettingsModule {}
