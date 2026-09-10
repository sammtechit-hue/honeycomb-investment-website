import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) {}

    async findAll(id: string) {
        return "All Notification for a specific investor";
    }

    //For Creating Notification
    async create(createNotificationDto: CreateNotificationDto) {
        const { email } = createNotificationDto;

        return {
            message: 'Notification Created Successfully'
        };
    }

    async updateStatus(id: string, dto: any) {
            return {
                message: 'notification status updated successfully'
            };
        }
}
