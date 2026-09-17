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
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentQueryDto } from './dto/query-incoming-payment.dto';
import { ConfirmIncomingPaymentDto } from './dto/confirm-incoming-payment.dto';
import { IncomingPaymentService } from './incoming-payment.service';

// Admin incoming payment endpoints — list/filter, confirm or reject
// investor-submitted payments.
@Controller('admin/incoming-payment')
@UsePipes(ZodValidationPipe)
export class IncomingPaymentController {
    constructor(
        private readonly incomingPaymentService: IncomingPaymentService,
    ) { }

    // GET /admin/incoming-payment?page=1&limit=20&sortBy=dueDate&sortOrder=desc&status=pending
    @Get()
    findAll(@Query() query: IncomingPaymentQueryDto) {
        return this.incomingPaymentService.findAll(query);
    }

    // GET /admin/incoming-payment/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single incoming payment data
        return this.incomingPaymentService.findOne(id);
    }

    // POST /admin/incoming-payment
    @Post()
    create(@Body() createIncomingPaymentDto: CreateIncomingPaymentDto) {
        // Create a new incoming payment record
        return this.incomingPaymentService.create(createIncomingPaymentDto);
    }

    // PATCH /admin/incoming-payment/:id — only the fields provided in the
    // request will be updated.
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateIncomingPaymentDto: UpdateIncomingPaymentDto,
    ) {
        return this.incomingPaymentService.update(id, updateIncomingPaymentDto);
    }

    // DELETE /admin/incoming-payment/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete an incoming payment by id
        return this.incomingPaymentService.remove(id);
    }

    // POST /admin/incoming-payment/:id/confirm — admin confirms or marks a
    // payment overdue. Body is validated by incomingPaymentConfirmSchema;
    // the id in the body must match the :id route param (the route param wins).
    @Post(':id/confirm')
    confirm(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() confirmIncomingPaymentDto: ConfirmIncomingPaymentDto,
    ) {
        return this.incomingPaymentService.confirm(id, confirmIncomingPaymentDto.status);
    }
}
