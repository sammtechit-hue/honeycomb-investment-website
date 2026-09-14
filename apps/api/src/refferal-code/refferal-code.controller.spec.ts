import { Test, TestingModule } from '@nestjs/testing';
import { RefferalCodeController } from './refferal-code.controller';

describe('RefferalCodeController', () => {
  let controller: RefferalCodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefferalCodeController],
    }).compile();

    controller = module.get<RefferalCodeController>(RefferalCodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
