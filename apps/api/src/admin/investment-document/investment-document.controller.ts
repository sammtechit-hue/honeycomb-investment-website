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
import { CreateInvestmentDocumentDto } from './dto/create-investment-document.dto';
import { UpdateInvestmentDocumentDto } from './dto/update-investment-document.dto';
import { InvestmentDocumentQueryDto } from './dto/query-investment-document.dto';
import { InvestmentDocumentService } from './investment-document.service';

// Admin endpoints for investment documents — where the deed, cheque, voucher
// and certificate handovers get recorded. Validation is scoped to this
// controller (@UsePipes) instead of globally — see main.ts for why.
@Controller('admin/investment-document')
@UsePipes(ZodValidationPipe)
export class InvestmentDocumentController {
    constructor(
        private readonly investmentDocumentService: InvestmentDocumentService,
    ) { }

    // For getting all investment document bundles with filtering, searching,
    // sorting & pagination.
    // GET /api/admin/investment-document?search=deed&investmentId=
    //   &hasDocument=certificate&uploadedFrom=&uploadedTo=
    //   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
    @Get()
    findAll(@Query() query: InvestmentDocumentQueryDto) {
        // Search, filters, uploaded-at range, sort and pagination are
        // validated by InvestmentDocumentQueryDto.
        return this.investmentDocumentService.findAll(query);
    }

    // GET /admin/investment-document/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single investment document data
        return this.investmentDocumentService.findOne(id);
    }

    // POST /admin/investment-document
    // At least one document slot is required; Prisma enforces one bundle per
    // investment (investmentId is unique).
    @Post()
    create(@Body() createInvestmentDocumentDto: CreateInvestmentDocumentDto) {
        // Create a new investment document record
        return this.investmentDocumentService.create(createInvestmentDocumentDto);
    }

    // PATCH /admin/investment-document/:id
    // Used to record each handover (certificate given, souvenir given, ...).
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateInvestmentDocumentDto: UpdateInvestmentDocumentDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.investmentDocumentService.update(id, updateInvestmentDocumentDto);
    }

    // DELETE /admin/investment-document/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete an investment document by id
        return this.investmentDocumentService.remove(id);
    }
}
