import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';
import { DisbursementBatchService } from './disbursement-batch.service';

@Controller('disbursement-batch')
export class DisbursementBatchController {
  constructor(private readonly disbursementBatchService: DisbursementBatchService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // GET /disbursement-batch?search=slot_1&status=draft&category=cbl&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.disbursementBatchService.findAll({
      search,
      status,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single disbursement batch data
    return this.disbursementBatchService.findOne(id);
  }

  @Post()
  create(@Body() createDisbursementBatchDto: CreateDisbursementBatchDto) {
    return this.disbursementBatchService.create(createDisbursementBatchDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDisbursementBatchDto: UpdateDisbursementBatchDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.disbursementBatchService.update(id, updateDisbursementBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.disbursementBatchService.remove(id);
  }
}
