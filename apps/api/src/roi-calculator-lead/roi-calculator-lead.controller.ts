import {
  Body,
  Controller,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateRoiCalculatorLeadDto } from './dto/create-roi-calculator-lead.dto';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';

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