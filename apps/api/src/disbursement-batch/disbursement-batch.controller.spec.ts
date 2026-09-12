import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementBatchController } from './disbursement-batch.controller';

describe('DisbursementBatchController', () => {
  let controller: DisbursementBatchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisbursementBatchController],
    }).compile();

    controller = module.get<DisbursementBatchController>(DisbursementBatchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
