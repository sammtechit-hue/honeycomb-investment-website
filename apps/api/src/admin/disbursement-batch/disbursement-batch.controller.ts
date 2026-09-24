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
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';
import { DisbursementBatchQueryDto } from './dto/query-disbursement-batch.dto';
import { DisbursementBatchService } from './disbursement-batch.service';

// Admin disbursement batch endpoints — list/filter batches, create a batch
// draft and move it through draft → exported → confirmed.
// Validation is scoped to this controller (@UsePipes): the global class-validator
// pipe strips every field on zod DTOs. See main.ts.
@Controller('admin/disbursement-batch')
@UsePipes(ZodValidationPipe)
export class DisbursementBatchController {
    constructor(
        private readonly disbursementBatchService: DisbursementBatchService,
    ) { }

    // GET /api/admin/disbursement-batch?search=1st&slot=slot_1&exportType=cbl&status=draft
    //   &batchDateFrom=&batchDateTo=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: DisbursementBatchQueryDto) {
        // Search, filters, batch date range, sort and pagination are
        // validated by DisbursementBatchQueryDto.
        return this.disbursementBatchService.findAll(query);
    }

    // GET /api/admin/disbursement-batch/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single disbursement batch data
        return this.disbursementBatchService.findOne(id);
    }

    // POST /api/admin/disbursement-batch
    @Post()
    create(@Body() createDisbursementBatchDto: CreateDisbursementBatchDto) {
        // Create a new disbursement batch record (slot, slotLabel, batchDate,
        // exportType; status defaults to draft).
        return this.disbursementBatchService.create(createDisbursementBatchDto);
    }

    // PATCH /api/admin/disbursement-batch/:id
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDisbursementBatchDto: UpdateDisbursementBatchDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.disbursementBatchService.update(id, updateDisbursementBatchDto);
    }

    // DELETE /api/admin/disbursement-batch/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete a disbursement batch by id
        return this.disbursementBatchService.remove(id);
    }
}
