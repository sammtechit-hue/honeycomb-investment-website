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
import { CreateDisbursementItemDto } from './dto/create-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';
import { DisbursementItemQueryDto } from './dto/query-disbursement-item.dto';
import { DisbursementItemService } from './disbursement-item.service';

// Admin disbursement item endpoints — the payout line items that make up a
// CBL/BEFTN export file inside a disbursement batch.
// Validation is scoped to this controller (@UsePipes): the global class-validator
// pipe strips every field on zod DTOs. See main.ts.
@Controller('admin/disbursement-item')
@UsePipes(ZodValidationPipe)
export class DisbursementItemController {
    constructor(
        private readonly disbursementItemService: DisbursementItemService,
    ) { }

    // GET /api/admin/disbursement-item?search=ROI&batchId=&investmentId=&investorId=
    //   &exportFormat=cbl&minAmount=&maxAmount=&page=1&limit=10&sortBy=amount&sortOrder=desc
    @Get()
    findAll(@Query() query: DisbursementItemQueryDto) {
        // Search, filters, amount range, sort and pagination are validated by
        // DisbursementItemQueryDto.
        return this.disbursementItemService.findAll(query);
    }

    // GET /api/admin/disbursement-item/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single disbursement item data
        return this.disbursementItemService.findOne(id);
    }

    // POST /api/admin/disbursement-item
    @Post()
    create(@Body() createDisbursementItemDto: CreateDisbursementItemDto) {
        // Create a new disbursement item (line item for CBL/BEFTN export)
        return this.disbursementItemService.create(createDisbursementItemDto);
    }

    // PATCH /api/admin/disbursement-item/:id
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDisbursementItemDto: UpdateDisbursementItemDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.disbursementItemService.update(id, updateDisbursementItemDto);
    }

    // DELETE /api/admin/disbursement-item/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete a disbursement item by id
        return this.disbursementItemService.remove(id);
    }
}
