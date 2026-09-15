import { Body, Controller, Get, Param, Patch, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentService } from './investment.service';

@Controller('admin/investment')
@UsePipes(ZodValidationPipe)
export class InvestmentController {
    constructor(
        private readonly investmentService: InvestmentService,
    ) { }

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

