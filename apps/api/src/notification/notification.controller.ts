import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    // For Investor and admin
    @Get(':id')
    findAll(@Param('id') id: string){
        return this.notificationService.findAll(id);
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
