import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentDocumentService } from './investment-document.service';

describe('InvestmentDocumentService', () => {
  let service: InvestmentDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestmentDocumentService],
    }).compile();

    service = module.get<InvestmentDocumentService>(InvestmentDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
