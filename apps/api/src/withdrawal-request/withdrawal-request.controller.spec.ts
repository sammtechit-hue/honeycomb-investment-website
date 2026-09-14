import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalRequestController } from './withdrawal-request.controller';

describe('WithdrawalRequestController', () => {
  let controller: WithdrawalRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawalRequestController],
    }).compile();

    controller = module.get<WithdrawalRequestController>(WithdrawalRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
