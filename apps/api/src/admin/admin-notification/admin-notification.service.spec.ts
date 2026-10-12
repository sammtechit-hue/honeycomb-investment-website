import { Test, TestingModule } from '@nestjs/testing';
import { AdminNotificationService } from './admin-notification.service';

describe('AdminNotificationService', () => {
  let service: AdminNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminNotificationService],
    }).compile();

    service = module.get<AdminNotificationService>(AdminNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
