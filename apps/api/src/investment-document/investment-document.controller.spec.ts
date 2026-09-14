import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentDocumentController } from './investment-document.controller';

describe('InvestmentDocumentController', () => {
  let controller: InvestmentDocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentDocumentController],
    }).compile();

    controller = module.get<InvestmentDocumentController>(InvestmentDocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
