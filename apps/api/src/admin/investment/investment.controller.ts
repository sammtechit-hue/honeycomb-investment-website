import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';
import { InvestmentService } from './investment.service';

// Admin investment endpoints — full visibility plus approval-side fields
// (status, rate, agreement fields, physical-item tracking flags).
@Controller('admin/investment')
@UsePipes(ZodValidationPipe)
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
  ) {
    // Only the fields provided in the request
    // will be updated.
    return this.investmentService.update(id, updateInvestmentDto);
  }
}
