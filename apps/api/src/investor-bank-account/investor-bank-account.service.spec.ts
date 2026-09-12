import { Test, TestingModule } from '@nestjs/testing';
import { InvestorBankAccountService } from './investor-bank-account.service';

describe('InvestorBankAccountService', () => {
  let service: InvestorBankAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestorBankAccountService],
    }).compile();

    service = module.get<InvestorBankAccountService>(InvestorBankAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
