import { Body, Controller, Get, Param, Post, Patch, Delete, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentService } from './investment.service';

@Controller('investment')
@UsePipes(ZodValidationPipe)
export class InvestmentController {
    constructor(
        private readonly investmentService: InvestmentService,
    ) { }

    @Get('')

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.investmentService.findOne(id);
    }

    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() updateInvestmentDto: UpdateInvestmentDto,
    ) {
      // Only the fields provided in the request
      // will be updated.

      return this.investmentService.update(id, updateInvestmentDto);
    }



}
