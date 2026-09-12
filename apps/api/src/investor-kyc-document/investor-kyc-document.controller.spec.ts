import { Test, TestingModule } from '@nestjs/testing';
import { InvestorKycDocumentController } from './investor-kyc-document.controller';

describe('InvestorKycDocumentController', () => {
  let controller: InvestorKycDocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestorKycDocumentController],
    }).compile();

    controller = module.get<InvestorKycDocumentController>(InvestorKycDocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
