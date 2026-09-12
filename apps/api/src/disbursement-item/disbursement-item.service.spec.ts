import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementItemService } from './disbursement-item.service';

describe('DisbursementItemService', () => {
  let service: DisbursementItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisbursementItemService],
    }).compile();

    service = module.get<DisbursementItemService>(DisbursementItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
