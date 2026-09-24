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
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';
import { DisbursementBatchQueryDto } from './dto/query-disbursement-batch.dto';
import { DisbursementBatchService } from './disbursement-batch.service';

// Investor-facing disbursement batch endpoints (payout batch history).
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('disbursement-batch')
@UsePipes(ZodValidationPipe)
export class DisbursementBatchController {
  constructor(private readonly disbursementBatchService: DisbursementBatchService) {}

  // GET /api/disbursement-batch?search=1st&slot=slot_1&exportType=cbl&status=confirmed
  //   &batchDateFrom=&batchDateTo=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: DisbursementBatchQueryDto) {
    // Search, filters, batch date range, sort and pagination are
    // validated by DisbursementBatchQueryDto.
    return this.disbursementBatchService.findAll(query);
  }

  // GET /api/disbursement-batch/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single disbursement batch data
    return this.disbursementBatchService.findOne(id);
  }

  // POST /api/disbursement-batch
  @Post()
  create(@Body() createDisbursementBatchDto: CreateDisbursementBatchDto) {
    return this.disbursementBatchService.create(createDisbursementBatchDto);
  }

  // PATCH /api/disbursement-batch/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDisbursementBatchDto: UpdateDisbursementBatchDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.disbursementBatchService.update(id, updateDisbursementBatchDto);
  }

  // DELETE /api/disbursement-batch/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.disbursementBatchService.remove(id);
  }
}
