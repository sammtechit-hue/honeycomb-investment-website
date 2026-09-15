import { Test, TestingModule } from '@nestjs/testing';
import { IncomingPaymentService } from './incoming-payment.service';

describe('IncomingPaymentService', () => {
  let service: IncomingPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncomingPaymentService],
    }).compile();

    service = module.get<IncomingPaymentService>(IncomingPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
