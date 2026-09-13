import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateInvestmentDocumentDto } from './dto/create-investment-document.dto';
import { UpdateInvestmentDocumentDto } from './dto/update-investment-document.dto';
import { InvestmentDocumentService } from './investment-document.service';

@Controller('admin/investment-document')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InvestmentDocumentController {
    constructor(
        private readonly investmentDocumentService: InvestmentDocumentService,
    ) { }

    // GET /admin/investment-document?search=deed&status=active&category=certificate&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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
        // GET /admin/investment-document?search=deed&status=active&category=certificate&page=1&limit=10&sortBy=createdAt&sortOrder=desc
        return this.investmentDocumentService.findAll({
            search,
            status,
            category,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            sortBy: sortBy ?? 'createdAt',
            sortOrder: sortOrder ?? 'desc',
        });
    }

    // GET /admin/investment-document/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        // Return a single investment document data
        return this.investmentDocumentService.findOne(id);
    }

    // POST /admin/investment-document
    @Post()
    create(@Body() createInvestmentDocumentDto: CreateInvestmentDocumentDto) {
        // Create a new investment document record
        return this.investmentDocumentService.create(createInvestmentDocumentDto);
    }

    // PATCH /admin/investment-document/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateInvestmentDocumentDto: UpdateInvestmentDocumentDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.investmentDocumentService.update(id, updateInvestmentDocumentDto);
    }

    // DELETE /admin/investment-document/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        // Delete an investment document by id
        return this.investmentDocumentService.remove(id);
    }
}
