import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';

describe('MonthlyProfitLedgerService', () => {
  let service: MonthlyProfitLedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonthlyProfitLedgerService],
    }).compile();

    service = module.get<MonthlyProfitLedgerService>(MonthlyProfitLedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
