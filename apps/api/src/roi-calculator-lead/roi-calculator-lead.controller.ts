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
import { CreateRoiCalculatorLeadDto } from './dto/create-roi-calculator-lead.dto';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';

// Scoped to this controller only — the app-wide ValidationPipe in main.ts
// still runs class-validator for every other resource until they migrate.
@Controller('roi-calculator-lead')
@UsePipes(ZodValidationPipe)
export class RoiCalculatorLeadController {
  constructor(
    private readonly roiCalculatorLeadService: RoiCalculatorLeadService,
  ) {}

  // POST /api/roi-calculator-lead
  @Post()
  create(@Body() createRoiCalculatorLeadDto: CreateRoiCalculatorLeadDto) {
    return this.roiCalculatorLeadService.create(createRoiCalculatorLeadDto);
  }  
}

