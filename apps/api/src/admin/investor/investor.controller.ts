import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { InvestorService } from './investor.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
// import { QueryInvestorDto } from './dto/query-investor.dto';

@Controller('admin/investor')
export class InvestorController {
  constructor(
    private readonly investorService: InvestorService,
  ) { }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('verified_kyc') verified_kyc?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('min') min?: number,
    @Query('max') max?: number,
  ) {
    // GET /admin/investor?search=john&status=active&category=gold&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.investorService.findAll({
      search,
      status,
      verified_kyc,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
    });
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

