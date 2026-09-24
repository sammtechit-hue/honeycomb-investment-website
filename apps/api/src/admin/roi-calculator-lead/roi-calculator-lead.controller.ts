import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { UpdateRoiCalculatorLeadDto } from './dto/update-roi-calculator-lead.dto';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';
import { RoiCalculatorLeadQueryDto } from './dto/query-roi-calculator-lead.dto';

@Controller('admin/roi-calculator-lead')
@UsePipes(ZodValidationPipe)
export class RoiCalculatorLeadController {
    constructor(private readonly roiCalculatorLeadService: RoiCalculatorLeadService) { }

    // GET /api/roi-calculator-lead?search=john&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: RoiCalculatorLeadQueryDto) {
        return this.roiCalculatorLeadService.findAll(query);
    }

    // GET /api/roi-calculator-lead/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.roiCalculatorLeadService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateRoiCalculatorLeadDto: UpdateRoiCalculatorLeadDto,
    ) {
        return this.roiCalculatorLeadService.update(id, updateRoiCalculatorLeadDto)
    }

    // DELETE /api/roi-calculator-lead/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.roiCalculatorLeadService.remove(id);
    }
}
