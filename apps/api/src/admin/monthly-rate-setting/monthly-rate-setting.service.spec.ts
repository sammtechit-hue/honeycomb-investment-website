import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyRateSettingService } from './monthly-rate-setting.service';

describe('MonthlyRateSettingService', () => {
  let service: MonthlyRateSettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonthlyRateSettingService],
    }).compile();

    service = module.get<MonthlyRateSettingService>(MonthlyRateSettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
