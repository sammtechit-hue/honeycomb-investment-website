import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
// import { QueryNotificationDto } from './dto/query-notification.dto';

@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    // For Investor and admin - with filtering, searching, sorting & pagination like admin/investor findAll
    @Get(':id')
    findAll(
        @Param('id') id: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('category') category?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ){
        // GET /notification/:id?search=john&status=active&category=gold&page=1&limit=10&sortBy=createdAt&sortOrder=desc
        return this.notificationService.findAll({
            id,
            search,
            status,
            category,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            sortBy: sortBy ?? 'createdAt',
            sortOrder: sortOrder ?? 'desc',
        });
    }

    @Post()
    createNotification(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationService.create(createNotificationDto);
    }

    // For update one's notification status
    @Patch(':id/status')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.notificationService.updateStatus(id, dto);
    }
}
