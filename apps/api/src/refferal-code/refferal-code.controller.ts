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
import { CreateRefferalCodeDto } from './dto/create-refferal-code.dto';
import { UpdateRefferalCodeDto } from './dto/update-refferal-code.dto';
import { RefferalCodeQueryDto } from './dto/query-refferal-code.dto';
import { RefferalCodeService } from './refferal-code.service';

// Referral code endpoints — the shareable codes an investor owns, whether they
// have been redeemed and when they expire.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('refferal-code')
@UsePipes(ZodValidationPipe)
export class RefferalCodeController {
  // Inject RefferalCodeService to handle business logic.
  constructor(private readonly refferalCodeService: RefferalCodeService) {}

  // For getting all refferal codes with filtering, searching, sorting & pagination.
  // GET /api/refferal-code?search=ABC123&referrerId=&referredId=&isUsed=false
  //   &expiresAfter=&expiresBefore=&fromDate=&toDate=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: RefferalCodeQueryDto) {
    // Search, filters, expiry/created date ranges, sort and pagination are
    // validated by RefferalCodeQueryDto.
    return this.refferalCodeService.findAll(query);
  }

  // For getting a single refferal code by id.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single refferal code data.
    return this.refferalCodeService.findOne(id);
  }

  // For creating a new refferal code.
  // `code` is stored upper-cased; `isUsed` defaults to false.
  @Post()
  create(@Body() createRefferalCodeDto: CreateRefferalCodeDto) {
    return this.refferalCodeService.create(createRefferalCodeDto);
  }

  // For updating an existing refferal code by id.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRefferalCodeDto: UpdateRefferalCodeDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.refferalCodeService.update(id, updateRefferalCodeDto);
  }

  // For deleting a refferal code by id.
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.refferalCodeService.remove(id);
  }
}
