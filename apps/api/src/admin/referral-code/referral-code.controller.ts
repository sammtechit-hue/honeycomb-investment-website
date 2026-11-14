import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { ReferralCodeService } from './referral-code.service';
import { ReferralCodeQueryDto } from './dto/query-referral-code.dto';
import { UpdateReferralCodeDto } from './dto/update-referral-code.dto';

@Controller('admin/referral-code')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class ReferralCodeController {
  constructor(private readonly referralCodeService: ReferralCodeService) {}

  // GET /api/admin/referral-code?search=ABC123&referrerId=&referredId=&isUsed=false
  //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: ReferralCodeQueryDto) {
    return this.referralCodeService.findAllReferralCode(query);
  }

  // PATCH /api/admin/referral-code/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReferralCodeDto: UpdateReferralCodeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const context = {
      ipAddress: ip,
      userAgent: userAgent,
      sessionId: sessionId,
    };

    // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
    return this.referralCodeService.updateReferralCode(
      id,
      updateReferralCodeDto,
      user?.userId,
      context,
    );
  }
}
