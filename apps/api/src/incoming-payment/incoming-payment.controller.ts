import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentService } from './incoming-payment.service';

@Controller('incoming-payment')
export class IncomingPaymentController {
  constructor(private readonly incomingPaymentService: IncomingPaymentService) {}

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
    // GET /incoming-payment?search=bkash&status=pending&category=bkash&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.incomingPaymentService.findAll({
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
    // Return a single incoming payment data
    return this.incomingPaymentService.findOne(id);
  }

  @Post()
  create(@Body() createIncomingPaymentDto: CreateIncomingPaymentDto) {
    return this.incomingPaymentService.create(createIncomingPaymentDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIncomingPaymentDto: UpdateIncomingPaymentDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.incomingPaymentService.update(id, updateIncomingPaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.incomingPaymentService.remove(id);
  }
}
