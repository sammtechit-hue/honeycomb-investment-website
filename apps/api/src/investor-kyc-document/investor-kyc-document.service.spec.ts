import { Test, TestingModule } from '@nestjs/testing';
import { InvestorKycDocumentService } from './investor-kyc-document.service';

describe('InvestorKycDocumentService', () => {
  let service: InvestorKycDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestorKycDocumentService],
    }).compile();

    service = module.get<InvestorKycDocumentService>(InvestorKycDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
