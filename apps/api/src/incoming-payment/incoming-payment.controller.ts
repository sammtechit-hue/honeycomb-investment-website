import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentQueryDto } from './dto/query-incoming-payment.dto';
import { IncomingPaymentService } from './incoming-payment.service';

// Investor-facing incoming payment endpoints (payment submissions, history).
@Controller('incoming-payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
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
  // Cookie JWT is verified first (JwtAuthGuard → JwtStrategy); RolesGuard
  // then requires INVESTOR. SUPER_ADMIN normally bypasses RolesGuard, so
  // the extra role check below keeps this route investor-only.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createIncomingPaymentDto: CreateIncomingPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.INVESTOR) {
      throw new ForbiddenException(
        'Only investors can submit an incoming payment.',
      );
    }
    return this.incomingPaymentService.create(
      createIncomingPaymentDto,
      user?.userId,
    );
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
