import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) {}

    // For Getting All Notification's Data with filtering, searching, sorting & pagination
    // Example: GET /notification/:id?search=john&status=active&category=gold&page=1&limit=10
    async findAll({
        id,
        search,
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    }: {
        id: string;
        search?: string;
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        return {
            message: search +  "HelloWorld Return all Notification's data",
        };
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
