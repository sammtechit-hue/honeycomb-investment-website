import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateDisbursementItemDto } from './dto/create-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';
import { DisbursementItemService } from './disbursement-item.service';

@Controller('admin/disbursement-item')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DisbursementItemController {
    constructor(
        private readonly disbursementItemService: DisbursementItemService,
    ) { }

    // GET /admin/disbursement-item?search=ROI&status=cbl&category=cbl&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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
        // GET /admin/disbursement-item?search=ROI&status=cbl&category=cbl&page=1&limit=10&sortBy=createdAt&sortOrder=desc
        return this.disbursementItemService.findAll({
            search,
            status,
            category,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            sortBy: sortBy ?? 'createdAt',
            sortOrder: sortOrder ?? 'desc',
        });
    }

    // GET /admin/disbursement-item/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        // Return a single disbursement item data
        return this.disbursementItemService.findOne(id);
    }

    // POST /admin/disbursement-item
    @Post()
    create(@Body() createDisbursementItemDto: CreateDisbursementItemDto) {
        // Create a new disbursement item (line item for CBL/BEFTN export)
        return this.disbursementItemService.create(createDisbursementItemDto);
    }

    // PATCH /admin/disbursement-item/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateDisbursementItemDto: UpdateDisbursementItemDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.disbursementItemService.update(id, updateDisbursementItemDto);
    }

    // DELETE /admin/disbursement-item/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        // Delete a disbursement item by id
        return this.disbursementItemService.remove(id);
    }
}
