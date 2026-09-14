import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentService } from './incoming-payment.service';

@Controller('admin/incoming-payment')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class IncomingPaymentController {
    constructor(
        private readonly incomingPaymentService: IncomingPaymentService,
    ) { }

    // GET /admin/incoming-payment?search=bkash&status=pending&category=bkash&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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
        // GET /admin/incoming-payment?search=bkash&status=pending&category=bkash&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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

    // GET /admin/incoming-payment/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        // Return a single incoming payment data
        return this.incomingPaymentService.findOne(id);
    }

    // POST /admin/incoming-payment
    @Post()
    create(@Body() createIncomingPaymentDto: CreateIncomingPaymentDto) {
        // Create a new incoming payment record
        return this.incomingPaymentService.create(createIncomingPaymentDto);
    }

    // PATCH /admin/incoming-payment/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateIncomingPaymentDto: UpdateIncomingPaymentDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.incomingPaymentService.update(id, updateIncomingPaymentDto);
    }

    // DELETE /admin/incoming-payment/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        // Delete an incoming payment by id
        return this.incomingPaymentService.remove(id);
    }
}
