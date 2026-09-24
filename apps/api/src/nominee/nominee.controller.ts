import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateNomineeDto } from './dto/create-nominee.dto';
import { UpdateNomineeDto } from './dto/update-nominee.dto';
import { NomineeQueryDto } from './dto/query-nominee.dto';
import { NomineeService } from './nominee.service';

// Nominee endpoints — the beneficiary registered against an investor (1:1).
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('nominee')
@UsePipes(ZodValidationPipe)
export class NomineeController {
    constructor(private readonly nomineeService: NomineeService) { }

    // For getting all nominees with filtering, searching, sorting & pagination.
    // GET /api/nominee?search=Ayesha&investorId=&page=1&limit=10
    //   &sortBy=nomineeName&sortOrder=desc
    @Get()
    findAll(@Query() query: NomineeQueryDto) {
        // Search, filters, sort and pagination are validated by NomineeQueryDto.
        return this.nomineeService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.nomineeService.findOne(id);
    }

    // For creating a new nominee for an investor.
    // Prisma enforces 1:1 (investorId is unique) — a second nominee for the
    // same investor is rejected.
    @Post()
    create(@Body() createNomineeDto: CreateNomineeDto) {
        return this.nomineeService.create(createNomineeDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateNomineeDto: UpdateNomineeDto,
    ) {
        // Only the fields provided in the request
        // will be updated.
        return this.nomineeService.update(id, updateNomineeDto);
    }
}
