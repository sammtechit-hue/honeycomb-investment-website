import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementBatchService } from './disbursement-batch.service';

describe('DisbursementBatchService', () => {
  let service: DisbursementBatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisbursementBatchService],
    }).compile();

    service = module.get<DisbursementBatchService>(DisbursementBatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
