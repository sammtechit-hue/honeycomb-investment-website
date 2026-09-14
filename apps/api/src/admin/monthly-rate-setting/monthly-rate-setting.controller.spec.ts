import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyRateSettingController } from './monthly-rate-setting.controller';

describe('MonthlyRateSettingController', () => {
  let controller: MonthlyRateSettingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlyRateSettingController],
    }).compile();

    controller = module.get<MonthlyRateSettingController>(MonthlyRateSettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
