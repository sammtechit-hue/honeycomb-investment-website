import { Test, TestingModule } from '@nestjs/testing';
import { InvestorBankAccountController } from './investor-bank-account.controller';

describe('InvestorBankAccountController', () => {
  let controller: InvestorBankAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestorBankAccountController],
    }).compile();

    controller = module.get<InvestorBankAccountController>(InvestorBankAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
