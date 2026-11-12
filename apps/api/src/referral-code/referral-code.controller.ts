import {
  Body,
  Controller,
  Delete,
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
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { UpdateRefferalCodeDto } from './dto/update-referral-code.dto';
import { ReferralCodeQueryDto as ReferralCodeQueryDto } from './dto/query-referral-code.dto';
import { ReferralCodeService } from './referral-code.service';


@Controller('refferal-code')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
export class ReferralCodeController {
  constructor(private readonly refferalCodeService: ReferralCodeService) { }

  // GET /api/refferal-code?search=ABC123&referrerId=&referredId=&isUsed=false
  //   &expiresAfter=&expiresBefore=&fromDate=&toDate=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: ReferralCodeQueryDto) {
    return this.refferalCodeService.findAllReferralCode(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.refferalCodeService.findOneReferralCode(id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refferalCodeService.createReferralCode(user?.userId);
  }
}
