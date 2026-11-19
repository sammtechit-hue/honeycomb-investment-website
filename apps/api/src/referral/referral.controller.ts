import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { ReferralService } from './referral.service';
import { ReferralQueryDto } from './dto/query-referral.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@investment-platform/db';

@Controller('referral')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
@UsePipes(ZodValidationPipe)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) { }

  // GET /api/referral?search=ABC123&referrerId=&referredInvestorId=&minBonusAmount=&maxBonusAmount=&fromDate=&toDate=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(
    @Query() query: ReferralQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.INVESTOR) {
          throw new ForbiddenException(
            'Only investors allow',
          );
        }
    return this.referralService.findAllReferral(query, user?.userId);
  }

  // GET /api/referral/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralService.findOne(id);
  }

}
