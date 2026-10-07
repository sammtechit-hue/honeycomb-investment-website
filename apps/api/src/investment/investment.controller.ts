import {
  Body,
  Controller,
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
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';
import { InvestmentService } from './investment.service';

// Investor-facing investment endpoints (scoped to the logged-in investor).
@Controller('investment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
@UsePipes(ZodValidationPipe)
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) { }

  // GET /api/investment?search=&status=&investmentType=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestmentQueryDto) {
    return this.investmentService.findAll(query);
  }

  // GET /api/investment/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investmentService.findOne(id);
  }

  // POST /api/investment
  // Cookie JWT is verified first (JwtAuthGuard → JwtStrategy); RolesGuard
  // then requires INVESTOR. SUPER_ADMIN normally bypasses RolesGuard, so
  // the extra role check below keeps this route investor-only as specified.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createInvestmentDto: CreateInvestmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.INVESTOR) {
      throw new ForbiddenException(
        'Only investors can create an investment.',
      );
    }
    return this.investmentService.create(createInvestmentDto, user?.userId);
  }

  // PATCH /api/investment/:id
  // Investors may only adjust investmentPeriodMonths and disbursementPeriod —
  // all other fields are rejected by investmentUpdateInputSchema.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestmentDto: UpdateInvestmentDto,
  ) {
    // Only the fields provided in the request
    // will be updated.
    return this.investmentService.update(id, updateInvestmentDto);
  }
}
