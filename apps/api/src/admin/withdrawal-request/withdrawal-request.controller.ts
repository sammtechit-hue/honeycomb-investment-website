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
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { WithdrawalRequestQueryDto } from './dto/query-withdrawal-request.dto';
import { WithdrawalRequestService } from './withdrawal-request.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '@investment-platform/db';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';

@Controller('admin/withdrawal-request')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class WithdrawalRequestController {
  
  constructor(private readonly withdrawalRequestService: WithdrawalRequestService) {}

  // For getting all withdrawal requests with filtering, searching, sorting &
  // pagination.
  // GET /api/admin/withdrawal-request?search=&investmentId=&status=pending
  //   &withdrawalMethod=auto&min=&max=&requestDateFrom=&requestDateTo=
  //   &page=1&limit=10&sortBy=requestDate&sortOrder=desc
  @Get()
  findAll(@Query() query: WithdrawalRequestQueryDto) {
    return this.withdrawalRequestService.findAllWithdrawalRequest(query);
  }

  // For getting a single withdrawal request by id.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single withdrawal request data.
    return this.withdrawalRequestService.findOneWithdrawalRequest(id);
  }

  // For creating a new withdrawal request.
  // `withdrawalMethod` defaults to "auto", `status` to "pending".
  @Post()
  create(@Body() createWithdrawalRequestDto: CreateWithdrawalRequestDto) {
    return this.withdrawalRequestService.createWithdrawalRequest(createWithdrawalRequestDto);
  }

  // For updating an existing withdrawal request by id.
  // The acting admin is recorded as `reviewedBy` on every update.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.withdrawalRequestService.updateWithdrawalRequest(
      id,
      updateWithdrawalRequestDto,
      user?.userId,
    );
  }

  // For deleting a withdrawal request by id.
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalRequestService.removeWithdrawalRequest(id);
  }
}
