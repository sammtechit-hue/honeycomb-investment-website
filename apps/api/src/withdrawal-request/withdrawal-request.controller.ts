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
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { WithdrawalRequestQueryDto } from './dto/query-withdrawal-request.dto';
import { WithdrawalRequestService } from './withdrawal-request.service';

@Controller('withdrawal-request')
@UsePipes(ZodValidationPipe)
export class WithdrawalRequestController {
  // Inject WithdrawalRequestService to handle business logic.
  constructor(
    private readonly withdrawalRequestService: WithdrawalRequestService,
  ) {}

  // For getting all withdrawal requests with filtering, searching, sorting &
  // pagination.
  // GET /api/withdrawal-request?search=&investmentId=&status=pending
  //   &withdrawalMethod=auto&min=&max=&requestDateFrom=&requestDateTo=
  //   &page=1&limit=10&sortBy=requestDate&sortOrder=desc
  @Get()
  findAll(@Query() query: WithdrawalRequestQueryDto) {
    // Search, filters, amount/date ranges, sort and pagination are validated
    // by WithdrawalRequestQueryDto.
    return this.withdrawalRequestService.findAll(query);
  }

  // For getting a single withdrawal request by id.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single withdrawal request data.
    return this.withdrawalRequestService.findOne(id);
  }

  // For creating a new withdrawal request.
  // `withdrawalMethod` defaults to "auto", `status` to "pending".
  @Post()
  create(@Body() createWithdrawalRequestDto: CreateWithdrawalRequestDto) {
    return this.withdrawalRequestService.create(createWithdrawalRequestDto);
  }

  // For updating an existing withdrawal request by id.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.withdrawalRequestService.update(id, updateWithdrawalRequestDto);
  }

  // For deleting a withdrawal request by id.
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalRequestService.remove(id);
  }
}
