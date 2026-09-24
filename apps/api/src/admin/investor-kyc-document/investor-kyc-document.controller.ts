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
import { CreateInvestorKycDocumentDto } from './dto/create-investor-kyc-document.dto';
import { UpdateInvestorKycDocumentDto } from './dto/update-investor-kyc-document.dto';
import { InvestorKycDocumentQueryDto } from './dto/query-investor-kyc-document.dto';
import { InvestorKycDocumentService } from './investor-kyc-document.service';

// Admin endpoints for investor KYC documents — the review queue behind
// "verified" investors. Validation is scoped to this controller (@UsePipes)
// instead of globally — see main.ts for why.
@Controller('admin/investor-kyc-document')
@UsePipes(ZodValidationPipe)
export class InvestorKycDocumentController {
    constructor(
        private readonly investorKycDocumentService: InvestorKycDocumentService,
    ) { }

    // For getting all KYC documents with filtering, searching, sorting &
    // pagination.
    // GET /api/admin/investor-kyc-document?search=nid&investorId=
    //   &verificationStatus=pending&uploadedFrom=&uploadedTo=
    //   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
    @Get()
    findAll(@Query() query: InvestorKycDocumentQueryDto) {
        // Search, filters, uploaded-at range, sort and pagination are
        // validated by InvestorKycDocumentQueryDto.
        return this.investorKycDocumentService.findAll(query);
    }

    // GET /admin/investor-kyc-document/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single investor KYC document data
        return this.investorKycDocumentService.findOne(id);
    }

    // POST /admin/investor-kyc-document
    // verificationStatus defaults to "pending".
    @Post()
    create(@Body() createInvestorKycDocumentDto: CreateInvestorKycDocumentDto) {
        // Create a new investor KYC document record
        return this.investorKycDocumentService.create(createInvestorKycDocumentDto);
    }

    // PATCH /admin/investor-kyc-document/:id
    // Used for review decisions (verificationStatus) and corrected file URLs.
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateInvestorKycDocumentDto: UpdateInvestorKycDocumentDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.investorKycDocumentService.update(id, updateInvestorKycDocumentDto);
    }

    // DELETE /admin/investor-kyc-document/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete an investor KYC document by id
        return this.investorKycDocumentService.remove(id);
    }
}
