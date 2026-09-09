import { Body, Controller, Get, Param, Post, Patch, Delete } from '@nestjs/common';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';

@Controller('investor')
export class InvestorController {
    constructor(
        private readonly investorService: InvestorService,
    ) { }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.investorService.findOne(id);
    }

    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() updateInvestorDto: UpdateInvestorDto,
    ) {
      // Only the fields provided in the request
      // will be updated.

      return this.investorService.update(id, updateInvestorDto);
    }



}
