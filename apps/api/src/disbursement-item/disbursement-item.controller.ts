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
import { CreateDisbursementItemDto } from './dto/create-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';
import { DisbursementItemQueryDto } from './dto/query-disbursement-item.dto';
import { DisbursementItemService } from './disbursement-item.service';

// Investor-facing disbursement item endpoints (individual payout lines shown
// in an investor's payout history).
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('disbursement-item')
@UsePipes(ZodValidationPipe)
export class DisbursementItemController {
  constructor(private readonly disbursementItemService: DisbursementItemService) { }

  // GET /api/disbursement-item?search=ROI&batchId=&investmentId=&investorId=
  //   &exportFormat=cbl&minAmount=&maxAmount=&page=1&limit=10&sortBy=amount&sortOrder=desc
  @Get()
  findAll(@Query() query: DisbursementItemQueryDto) {
    // Search, filters, amount range, sort and pagination are validated by
    // DisbursementItemQueryDto.
    return this.disbursementItemService.findAll(query);
  }

  // GET /api/disbursement-item/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single disbursement item data
    return this.disbursementItemService.findOne(id);
  }

  // POST /api/disbursement-item
  @Post()
  create(@Body() createDisbursementItemDto: CreateDisbursementItemDto) {
    return this.disbursementItemService.create(createDisbursementItemDto);
  }

  // PATCH /api/disbursement-item/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDisbursementItemDto: UpdateDisbursementItemDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.disbursementItemService.update(id, updateDisbursementItemDto);
  }

  // DELETE /api/disbursement-item/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.disbursementItemService.remove(id);
  }
}
