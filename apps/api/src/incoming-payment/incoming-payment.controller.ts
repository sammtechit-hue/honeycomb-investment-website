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
import { IncomingPaymentService } from './incoming-payment.service';

// Investor-facing incoming payment endpoints (payment submissions, history).
@Controller('incoming-payment')
@UsePipes(ZodValidationPipe)
export class IncomingPaymentController {
  constructor(private readonly incomingPaymentService: IncomingPaymentService) {}

  // GET /incoming-payment?page=1&limit=20&sortBy=dueDate&sortOrder=desc&status=pending
  @Get()
  findAll(@Query() query: IncomingPaymentQueryDto) {
    return this.incomingPaymentService.findAll(query);
  }

  // GET /incoming-payment/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single incoming payment data
    return this.incomingPaymentService.findOne(id);
  }

  // POST /incoming-payment — investor submits a payment (bkash/nagad/rocket/bank_transfer)
  // with screenshotUrl proof; status starts as 'pending' until admin confirms.
  @Post()
  create(@Body() createIncomingPaymentDto: CreateIncomingPaymentDto) {
    return this.incomingPaymentService.create(createIncomingPaymentDto);
  }

  // PATCH /incoming-payment/:id — only the fields provided in the request
  // will be updated.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateIncomingPaymentDto: UpdateIncomingPaymentDto,
  ) {
    return this.incomingPaymentService.update(id, updateIncomingPaymentDto);
  }

  // DELETE /incoming-payment/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.incomingPaymentService.remove(id);
  }
}
