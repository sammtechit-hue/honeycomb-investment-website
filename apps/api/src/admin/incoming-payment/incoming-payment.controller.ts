import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentQueryDto } from './dto/query-incoming-payment.dto';
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.MODERATOR)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateIncomingPaymentDto: UpdateIncomingPaymentDto,
        @CurrentUser() user: AuthenticatedUser,
        @Ip() ip?: string,
        @Headers('user-agent') userAgent?: string,
        @Headers('x-session-id') sessionId?: string,
    ) {
        const context = {
            ipAddress: ip,
            userAgent: userAgent,
            sessionId: sessionId,
        };

        // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
        return this.incomingPaymentService.update(
            id,
            updateIncomingPaymentDto,
            user?.userId,
            context,
        );
    }

    // DELETE /admin/incoming-payment/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete an incoming payment by id
        return this.incomingPaymentService.remove(id);
    }
}
