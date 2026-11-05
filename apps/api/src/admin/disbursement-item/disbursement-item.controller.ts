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
    UseGuards,
    UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { DisbursementItemQueryDto } from './dto/query-disbursement-item.dto';
import { DisbursementItemService } from './disbursement-item.service';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
// Admin disbursement item endpoints — the payout line items that make up a
// CBL/BEFTN export file inside a disbursement batch.
// Validation is scoped to this controller (@UsePipes): the global class-validator
// pipe strips every field on zod DTOs. See main.ts.
@Controller('admin/disbursement-item')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
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
        return this.disbursementItemService.findAllDisbursementItem(query);
    }

    // POST /api/admin/disbursement-item
    @Post()
    create() {
        // Create a new disbursement item (line item for CBL/BEFTN export)
        return this.disbursementItemService.createDisbursementItem();
    }

}
