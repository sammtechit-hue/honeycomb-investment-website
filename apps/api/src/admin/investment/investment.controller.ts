import {
  Body,
  Controller,
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
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';
import { InvestmentService } from './investment.service';

// Admin investment endpoints — full visibility plus approval-side fields
// (status, rate, agreement fields, physical-item tracking flags).
// Restricted to ADMIN and MODERATOR staff; SUPER_ADMIN passes via RolesGuard.
@Controller('admin/investment')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  // GET /api/admin/investment?search=&status=&investmentType=&projectId=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestmentQueryDto) {
    return this.investmentService.findAll(query);
  }

  // GET /api/admin/investment/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investmentService.findOne(id);
  }

  // POST /api/admin/investment
  @Post()
  create(@Body() createInvestmentDto: CreateInvestmentDto) {
    return this.investmentService.create(createInvestmentDto);
  }

  // PATCH /api/admin/investment/:id
  // Admins may additionally set status, rate, agreement fields and the
  // physical-item tracking flags — see investmentAdminUpdateInputSchema.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestmentDto: UpdateInvestmentDto,
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

    return this.investmentService.update(
      id,
      updateInvestmentDto,
      user?.userId,
      context,
    );
  }
}
