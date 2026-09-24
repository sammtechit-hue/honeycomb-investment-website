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
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralQueryDto } from './dto/query-referral.dto';
import { ReferralService } from './referral.service';

// Investor-facing referral endpoints — who referred whom, which referral code
// was used and the bonus that was paid out.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('referral')
@UsePipes(ZodValidationPipe)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // GET /api/referral?search=ABC123&referrerId=&referredInvestorId=&referralCodeId=
  //   &minBonusAmount=&maxBonusAmount=&fromDate=&toDate=
  //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: ReferralQueryDto) {
    // Search, filters, bonus/date ranges, sort and pagination are validated by
    // ReferralQueryDto.
    return this.referralService.findAll(query);
  }

  // GET /api/referral/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single referral data
    return this.referralService.findOne(id);
  }

  // POST /api/referral — referrerId, referredInvestorId and referralCodeId are
  // required; bonusPercent defaults to 1.00% (the Prisma default).
  @Post()
  create(@Body() createReferralDto: CreateReferralDto) {
    return this.referralService.create(createReferralDto);
  }

  // PATCH /api/referral/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReferralDto: UpdateReferralDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.referralService.update(id, updateReferralDto);
  }

  // DELETE /api/referral/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralService.remove(id);
  }
}
