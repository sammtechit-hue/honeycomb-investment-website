import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateInvestorKycDocumentDto } from './dto/create-investor-kyc-document.dto';
import { UpdateInvestorKycDocumentDto } from './dto/update-investor-kyc-document.dto';
import { InvestorKycDocumentService } from './investor-kyc-document.service';

@Controller('admin/investor-kyc-document')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InvestorKycDocumentController {
    constructor(
        private readonly investorKycDocumentService: InvestorKycDocumentService,
    ) { }

    // GET /admin/investor-kyc-document?search=nid&status=pending&category=nid&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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
        // GET /admin/investor-kyc-document?search=nid&status=pending&category=nid&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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

    // GET /admin/investor-kyc-document/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        // Return a single investor KYC document data
        return this.investorKycDocumentService.findOne(id);
    }

    // POST /admin/investor-kyc-document
    @Post()
    create(@Body() createInvestorKycDocumentDto: CreateInvestorKycDocumentDto) {
        // Create a new investor KYC document record
        return this.investorKycDocumentService.create(createInvestorKycDocumentDto);
    }

    // PATCH /admin/investor-kyc-document/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateInvestorKycDocumentDto: UpdateInvestorKycDocumentDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.investorKycDocumentService.update(id, updateInvestorKycDocumentDto);
    }

    // DELETE /admin/investor-kyc-document/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        // Delete an investor KYC document by id
        return this.investorKycDocumentService.remove(id);
    }
}
