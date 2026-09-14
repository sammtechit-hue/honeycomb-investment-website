import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { MonthlyRateSettingService } from './monthly-rate-setting.service';
// import { CreateMonthlyRateSettingDto } from './dto/create-monthly-rate-setting.dto';
// import { UpdateMonthlyRateSettingDto } from './dto/update-monthly-rate-setting.dto';

@Controller('admin/monthly-rate-setting')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MonthlyRateSettingController {
    constructor(
        private readonly monthlyRateSettingService: MonthlyRateSettingService,
    ) { }

    // GET /admin/monthly-rate-setting?search=&status=&category=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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
        // Return all monthly rate settings with filtering, searching, sorting & pagination
        return this.monthlyRateSettingService.findAll({
            search,
            status,
            category,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            sortBy: sortBy ?? 'createdAt',
            sortOrder: sortOrder ?? 'desc',
        });
    }

    // GET /admin/monthly-rate-setting/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        // Return a single monthly rate setting data
        return this.monthlyRateSettingService.findOne(id);
    }

    // POST /admin/monthly-rate-setting
    // Body: { "month": "January", "year": 2026, "rate": 5.5 }
    // @Post()
    // create(@Body() createMonthlyRateSettingDto: CreateMonthlyRateSettingDto) {
    //     return this.monthlyRateSettingService.create(createMonthlyRateSettingDto);
    // }

    // PATCH /admin/monthly-rate-setting/:id
    // Only the fields provided in the request will be updated.
    // @Patch(':id')
    // update(
    //     @Param('id') id: string,
    //     @Body() updateMonthlyRateSettingDto: UpdateMonthlyRateSettingDto,
    // ) {
    //     return this.monthlyRateSettingService.update(id, updateMonthlyRateSettingDto);
    // }

    // DELETE /admin/monthly-rate-setting/:id
    // @Delete(':id')
    // remove(@Param('id') id: string) {
    //     return this.monthlyRateSettingService.remove(id);
    // }
}
