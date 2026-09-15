import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateDisbursementItemDto } from './dto/create-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';
import { DisbursementItemService } from './disbursement-item.service';

@Controller('disbursement-item')
export class DisbursementItemController {
  constructor(private readonly disbursementItemService: DisbursementItemService) { }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('min') min?: number,
    @Query('max') max?: number,
  ) {
    // GET /disbursement-item?search=ROI&status=cbl&category=cbl&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.disbursementItemService.findAll({
      search,
      status,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single disbursement item data
    return this.disbursementItemService.findOne(id);
  }

  @Post()
  create(@Body() createDisbursementItemDto: CreateDisbursementItemDto) {
    return this.disbursementItemService.create(createDisbursementItemDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDisbursementItemDto: UpdateDisbursementItemDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.disbursementItemService.update(id, updateDisbursementItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.disbursementItemService.remove(id);
  }
}
