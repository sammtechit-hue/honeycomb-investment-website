import { Test, TestingModule } from '@nestjs/testing';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';

describe('RoiCalculatorLeadService', () => {
  let service: RoiCalculatorLeadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoiCalculatorLeadService],
    }).compile();

    service = module.get<RoiCalculatorLeadService>(RoiCalculatorLeadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
