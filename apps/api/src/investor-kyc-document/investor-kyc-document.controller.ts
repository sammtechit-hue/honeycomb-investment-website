import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateInvestorKycDocumentDto } from './dto/create-investor-kyc-document.dto';
import { UpdateInvestorKycDocumentDto } from './dto/update-investor-kyc-document.dto';
import { InvestorKycDocumentService } from './investor-kyc-document.service';

@Controller('investor-kyc-document')
export class InvestorKycDocumentController {
  constructor(private readonly investorKycDocumentService: InvestorKycDocumentService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // GET /investor-kyc-document?search=nid&status=pending&category=nid&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.investorKycDocumentService.findAll({
      search,
      status,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single investor KYC document data
    return this.investorKycDocumentService.findOne(id);
  }

  @Post()
  create(@Body() createInvestorKycDocumentDto: CreateInvestorKycDocumentDto) {
    return this.investorKycDocumentService.create(createInvestorKycDocumentDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInvestorKycDocumentDto: UpdateInvestorKycDocumentDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.investorKycDocumentService.update(id, updateInvestorKycDocumentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.investorKycDocumentService.remove(id);
  }
}
