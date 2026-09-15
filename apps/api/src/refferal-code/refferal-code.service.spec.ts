import { Test, TestingModule } from '@nestjs/testing';
import { RefferalCodeService } from './refferal-code.service';

describe('RefferalCodeService', () => {
  let service: RefferalCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefferalCodeService],
    }).compile();

    service = module.get<RefferalCodeService>(RefferalCodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
