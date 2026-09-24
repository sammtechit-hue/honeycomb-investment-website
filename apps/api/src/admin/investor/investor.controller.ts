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
  Req
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorQueryDto } from './dto/query-investor.dto';
import { InvestorService } from './investor.service';

// Scoped to this controller only — the app-wide ValidationPipe in main.ts
// still runs class-validator for every other resource until they migrate.
@Controller('admin/investor')
@UsePipes(ZodValidationPipe)
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  // GET /api/admin/investor?search=john&status=active&category=gold&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestorQueryDto) {
    return this.investorService.findAll(query);
  }

  // GET /api/admin/investor/:id   
  @Get(':id')                                               
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.findOne(id);
  }

  // POST /api/admin/investor
  @Post()
  create(@Body() createInvestorDto: CreateInvestorDto) {
    return this.investorService.create(createInvestorDto);
  }

  // PATCH /api/admin/investor/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
  ) {
    return this.investorService.update(id, updateInvestorDto);
  }

  // DELETE /api/admin/investor/:id  (soft delete — sets status to 'suspended')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.remove(id);
  }
}


