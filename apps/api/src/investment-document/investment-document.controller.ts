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

// Investment document endpoints — the paperwork bundle (deed, certificate,
// cheque, voucher, ...) attached to one investment. Validation is scoped to
// this controller (@UsePipes) instead of globally — see main.ts for why.
@Controller('investment-document')
@UsePipes(ZodValidationPipe)
export class InvestmentDocumentController {
  constructor(private readonly investmentDocumentService: InvestmentDocumentService) {}

  // GET /api/investment-document?search=deed&investmentId=
  //   &hasDocument=certificate&uploadedFrom=&uploadedTo=
  //   &page=1&limit=10&sortBy=uploadedAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestmentDocumentQueryDto) {
    // Search, filters, uploaded-at range, sort and pagination are validated by
    // InvestmentDocumentQueryDto.
    return this.investmentDocumentService.findAll(query);
  }

  // GET /api/investment-document/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single investment document data
    return this.investmentDocumentService.findOne(id);
  }

  // POST /api/investment-document
  // At least one document slot is required; Prisma enforces one bundle per
  // investment (investmentId is unique).
  @Post()
  create(@Body() createInvestmentDocumentDto: CreateInvestmentDocumentDto) {
    return this.investmentDocumentService.create(createInvestmentDocumentDto);
  }

  // PATCH /api/investment-document/:id
  // Uploads arrive one at a time as the paperwork is handed over.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestmentDocumentDto: UpdateInvestmentDocumentDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.investmentDocumentService.update(id, updateInvestmentDocumentDto);
  }

  // DELETE /api/investment-document/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.investmentDocumentService.remove(id);
  }
}
