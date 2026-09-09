import { Body, Controller, Get, Param, Post, Patch, Delete } from '@nestjs/common';
import { InvestorService } from './investor.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Controller('admin/investor')
export class InvestorController {
  constructor(
    private readonly investorService: InvestorService,
  ) { }

  @Get()
  findAll() {
    // Returns all investors from the database.
    return this.investorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single investor data
    return this.investorService.findOne(id);
  }

  // @Post()
  // create(@Body() createInvestorDto: CreateInvestorDto){
  //   return this.investorService.create(createInvestorDto);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateInvestorDto: UpdateInvestorDto,
  // ) {
  //   // Only the fields provided in the request
  //   // will be updated.

  //   return this.investorService.update(id, updateInvestorDto);
  // }

  
  // @Patch(':id/status')
  // update(@Param('id') id:string, @Body()updateInvestorDto: UpdateInvestorDto,){
  //   this.investorService.updateStatus(id, updateInvestorDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.investorService.remove(id);
  // }

  
}

