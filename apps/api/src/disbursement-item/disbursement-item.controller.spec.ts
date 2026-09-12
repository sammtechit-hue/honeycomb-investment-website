import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementItemController } from './disbursement-item.controller';

describe('DisbursementItemController', () => {
  let controller: DisbursementItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisbursementItemController],
    }).compile();

    controller = module.get<DisbursementItemController>(DisbursementItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
