import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request } from 'express';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { AdminAccountService } from './admin-account.service';

// SUPER_ADMIN only — ADMIN/MODERATOR can't create staff accounts.
@Controller('admin/accounts')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminAccountController {
  constructor(private readonly adminAccountService: AdminAccountService) {}

  // POST /api/admin/accounts
  @Post()
  create(
    @Body() dto: CreateAdminAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminAccountService.create(dto, user.userId, req.ip);
  }

  // POST /api/admin/accounts/:id/resend-invite
  @Post(':id/resend-invite')
  @HttpCode(HttpStatus.OK)
  resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminAccountService.resendInvite(id, user.userId, req.ip);
  }
}
