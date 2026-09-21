import { Injectable } from '@nestjs/common';
import type {
    AdminNotificationCreateInput,
    AdminNotificationQuery,
    AdminNotificationStatusUpdateInput,
} from '@investment-platform/contracts/notification';

@Injectable()
export class NotificationService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) {}

    // For Getting All Notification's Data with filtering, searching, sorting & pagination
    // Example: GET /notification?type=upcoming_payout&isRead=false&page=1&limit=10
    // Validated/normalized by NotificationQueryDto — all fields are typed.
    async findAll(query: AdminNotificationQuery) {
        return {
            message: "HelloWorld Return all Notification's data",
            query,
        };
    }

    // For Creating Notification
    // Validated by CreateNotificationDto — see
    // packages/contracts/src/notification.ts.
    async create(createNotificationDto: AdminNotificationCreateInput) {
        const { type, message } = createNotificationDto;

        return {
            message: 'Notification Created Successfully',
            data: createNotificationDto,
        };
    }

    // For updating one notification's read status.
    // Validated by UpdateNotificationStatusDto — only isRead is accepted.
    async updateStatus(id: string, dto: AdminNotificationStatusUpdateInput) {
        return {
            message: 'notification status updated successfully',
            data: dto,
        };
    }
}
