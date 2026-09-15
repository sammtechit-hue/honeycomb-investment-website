import { Test, TestingModule } from '@nestjs/testing';
import { NomineeService } from './nominee.service';

describe('NomineeService', () => {
  let service: NomineeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NomineeService],
    }).compile();

    service = module.get<NomineeService>(NomineeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
