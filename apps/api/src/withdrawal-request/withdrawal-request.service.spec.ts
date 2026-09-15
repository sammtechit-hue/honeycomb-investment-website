import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalRequestService } from './withdrawal-request.service';

describe('WithdrawalRequestService', () => {
  let service: WithdrawalRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WithdrawalRequestService],
    }).compile();

    service = module.get<WithdrawalRequestService>(WithdrawalRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
