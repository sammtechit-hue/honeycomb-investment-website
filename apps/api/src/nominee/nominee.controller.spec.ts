import { Test, TestingModule } from '@nestjs/testing';
import { NomineeController } from './nominee.controller';

describe('NomineeController', () => {
  let controller: NomineeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NomineeController],
    }).compile();

    controller = module.get<NomineeController>(NomineeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
