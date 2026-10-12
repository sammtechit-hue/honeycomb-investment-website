import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminNotificationQuery } from '@investment-platform/contracts/notification';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminNotificationService {
    constructor(private readonly prisma: PrismaService) {}

    //  http://localhost:3000/api/admin-notification?search=payout&type=upcoming_payout&isRead=false&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    async findAll(query: AdminNotificationQuery) {
        const {
            search,
            type,
            isRead,
            referenceId,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        const where: Prisma.AdminNotificationWhereInput = {
            ...(type && { type }),
            ...(isRead !== undefined && { isRead }),   //undefined used for store false value.
            ...(referenceId && { referenceId }),
            ...(search && {
                message: { contains: search, mode: 'insensitive' },
            }),
        };

        const orderBy: Prisma.AdminNotificationOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            { id: 'asc' },
        ];

        const [notifications, total] = await Promise.all([
            this.prisma.adminNotification.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.adminNotification.count({ where }),
        ]);

        return {
            message: 'Notifications fetched successfully',
            success: true,
            data: notifications,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const notification = await this.prisma.adminNotification.findUnique({
            where: { id },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        return {
            message: 'Notification fetched successfully',
            success: true,
            data: notification,
        };
    }
}
