import { Test, TestingModule } from '@nestjs/testing';
import { IncomingPaymentController } from './incoming-payment.controller';

describe('IncomingPaymentController', () => {
  let controller: IncomingPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncomingPaymentController],
    }).compile();

    controller = module.get<IncomingPaymentController>(IncomingPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
