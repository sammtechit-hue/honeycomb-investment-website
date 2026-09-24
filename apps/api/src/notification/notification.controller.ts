import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { NotificationQueryDto } from './dto/query-notification.dto';
import { NotificationService } from './notification.service';

// Admin notification endpoints — the in-app feed of payout reminders,
// investment requests and document expiries.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('notification')
@UsePipes(ZodValidationPipe)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    // For getting all notifications with filtering, searching, sorting &
    // pagination.
    // GET /api/notification?search=payout&type=upcoming_payout&isRead=false
    //   &referenceType=&referenceId=&createdFrom=&createdTo=
    //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: NotificationQueryDto) {
        // Search, filters, created-at range, sort and pagination are validated
        // by NotificationQueryDto.
        return this.notificationService.findAll(query);
    }

    // For creating a notification.
    // `isRead` defaults to false; `referenceId`/`referenceType` are an
    // all-or-nothing pair.
    @Post()
    createNotification(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationService.create(createNotificationDto);
    }

    // For updating one notification's read status.
    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateNotificationStatusDto,
    ) {
        return this.notificationService.updateStatus(id, dto);
    }
}
