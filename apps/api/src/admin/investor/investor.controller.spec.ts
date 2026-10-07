import { Test, TestingModule } from '@nestjs/testing';
import { InvestorController } from './investor.controller';
import { InvestorService } from './investor.service';

describe('InvestorController', () => {
  let controller: InvestorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestorController],
      providers: [
        {
          provide: InvestorService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvestorController>(InvestorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
