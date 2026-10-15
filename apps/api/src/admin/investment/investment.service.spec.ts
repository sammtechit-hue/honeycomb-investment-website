import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentService } from './investment.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvestmentService', () => {
  let service: InvestmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<InvestmentService>(InvestmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
