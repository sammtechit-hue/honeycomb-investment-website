import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { WithdrawalRequestService } from './withdrawal-request.service';

@Controller('withdrawal-request')
export class WithdrawalRequestController {
  constructor(private readonly withdrawalRequestService: WithdrawalRequestService) { }

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
    // GET /withdrawal-request?search=pending&status=pending&category=manual&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.withdrawalRequestService.findAll({
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
    // Return a single withdrawal request data
    return this.withdrawalRequestService.findOne(id);
  }

  @Post()
  create(@Body() createWithdrawalRequestDto: CreateWithdrawalRequestDto) {
    return this.withdrawalRequestService.create(createWithdrawalRequestDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.withdrawalRequestService.update(id, updateWithdrawalRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.withdrawalRequestService.remove(id);
  }
}
