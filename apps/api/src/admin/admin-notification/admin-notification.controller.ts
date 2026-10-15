import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminNotificationQueryDto } from './dto/query-admin-notification.dto';
import { AdminNotificationService } from './admin-notification.service';


@Controller('admin-notification')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class AdminNotificationController {
  constructor(
    private readonly adminNotificationService: AdminNotificationService,
  ) {}

  //  http://localhost:3000/api/admin-notification?search=payout&type=upcoming_payout&isRead=false&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: AdminNotificationQueryDto) {
    return this.adminNotificationService.findAll(query);
  }

  // GET /api/admin-notification/:id — AdminNotification.id is a uuid.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminNotificationService.findOne(id);
  }
}
