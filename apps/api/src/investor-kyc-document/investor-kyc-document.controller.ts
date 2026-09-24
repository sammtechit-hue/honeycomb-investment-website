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

// KYC document endpoints — an investor uploads their NID front/back and photo
// once; the set is reviewed by an admin. Validation is scoped to this
// controller (@UsePipes) instead of globally — see main.ts for why.
@Controller('investor-kyc-document')
@UsePipes(ZodValidationPipe)
export class InvestorKycDocumentController {
  constructor(private readonly investorKycDocumentService: InvestorKycDocumentService) {}

  // GET /api/investor-kyc-document?search=nid&investorId=
  //   &verificationStatus=pending&uploadedFrom=&uploadedTo=
  //   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestorKycDocumentQueryDto) {
    // Search, filters, uploaded-at range, sort and pagination are validated by
    // InvestorKycDocumentQueryDto.
    return this.investorKycDocumentService.findAll(query);
  }

  // GET /api/investor-kyc-document/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single investor KYC document data
    return this.investorKycDocumentService.findOne(id);
  }

  // POST /api/investor-kyc-document
  // verificationStatus defaults to "pending" — only an admin can change it.
  @Post()
  create(@Body() createInvestorKycDocumentDto: CreateInvestorKycDocumentDto) {
    return this.investorKycDocumentService.create(createInvestorKycDocumentDto);
  }

  // PATCH /api/investor-kyc-document/:id
  // Re-uploads of the document URLs — a changed status re-enters review.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorKycDocumentDto: UpdateInvestorKycDocumentDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.investorKycDocumentService.update(id, updateInvestorKycDocumentDto);
  }

  // DELETE /api/investor-kyc-document/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorKycDocumentService.remove(id);
  }
}
