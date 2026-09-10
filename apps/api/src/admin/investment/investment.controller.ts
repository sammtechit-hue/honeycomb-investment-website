import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentService } from './investment.service';

@Controller('admin/investment')
export class InvestmentController {
    constructor(
        private readonly investmentService: InvestmentService,
    ) { }

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
        // GET /admin/investor?search=john&status=active&category=gold&page=1&limit=10&sortBy=createdAt&sortOrder=desc
        return this.investmentService.findAll({
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
        return this.investmentService.findOne(id);
    }

    @Post()
    create(@Body() createInvestmentDto: CreateInvestmentDto) {
        return this.investmentService.create(createInvestmentDto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateInvestmentDto: UpdateInvestmentDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.investmentService.update(id, updateInvestmentDto);
    }



}
