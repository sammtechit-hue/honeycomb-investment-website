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
import { ReferralService } from './referral.service';
import { ReferralQueryDto } from './dto/query-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';

@Controller('admin/referral')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) { }

  // GET /api/admin/referral?search=ABC123&referrerId=&referredInvestorId=&minBonusAmount=&maxBonusAmount=&fromDate=&toDate=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: ReferralQueryDto) {
    return this.referralService.findAllReferral(query);
  }

  // PATCH /api/admin/referral/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReferralDto: UpdateReferralDto,
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
    return this.referralService.updateReferral(
      id,
      updateReferralDto,
      user?.userId,
      context,
    );
  }
}
