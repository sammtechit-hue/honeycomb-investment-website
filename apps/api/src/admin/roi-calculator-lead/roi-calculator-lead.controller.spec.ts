import { Test, TestingModule } from '@nestjs/testing';
import { RoiCalculatorLeadController } from './roi-calculator-lead.controller';

describe('RoiCalculatorLeadController', () => {
  let controller: RoiCalculatorLeadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoiCalculatorLeadController],
    }).compile();

    controller = module.get<RoiCalculatorLeadController>(RoiCalculatorLeadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
