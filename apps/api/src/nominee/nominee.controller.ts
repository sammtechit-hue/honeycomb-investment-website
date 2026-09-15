import { Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { NomineeService } from './nominee.service';

@Controller('nominee')
export class NomineeController {
    constructor(private readonly nomineeService: NomineeService) { }

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
        // GET /project?search=honeycomb&status=active&category=residential&page=1&limit=10&sortBy=createdAt&sortOrder=desc
        return this.nomineeService.findAll({
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
        return this.nomineeService.findOne(id);
    }

    @Post()
    Create(@Body() cDto: CDto) {
        return this.nomineeService.create(cDto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() uDto: UDto,
    ) {
        return this.nomineeService.update(id, uDto);
    }
}
