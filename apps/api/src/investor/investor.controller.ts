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
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';

// Scoped to this controller only — the app-wide ValidationPipe in main.ts
// still runs class-validator for every other resource until they migrate.
@Controller('investor')
@UsePipes(ZodValidationPipe)
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  // GET /api/investor/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.findOne(id);
  }

  // POST /api/investor
  @Post()
  create(@Body() createInvestorDto: CreateInvestorDto) {
    return this.investorService.create(createInvestorDto);
  }

  // PATCH /api/investor/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
  ) {
    return this.investorService.update(id, updateInvestorDto);
  }
}
