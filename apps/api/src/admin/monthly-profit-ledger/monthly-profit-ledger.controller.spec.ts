import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyProfitLedgerController } from './monthly-profit-ledger.controller';

describe('MonthlyProfitLedgerController', () => {
  let controller: MonthlyProfitLedgerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlyProfitLedgerController],
    }).compile();

    controller = module.get<MonthlyProfitLedgerController>(MonthlyProfitLedgerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
