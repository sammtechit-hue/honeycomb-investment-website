import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { WithdrawalRequestQueryDto } from './dto/query-withdrawal-request.dto';
import { WithdrawalRequestService } from './withdrawal-request.service';

@Controller('withdrawal-request')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
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
  findAll(
    @Query() query: WithdrawalRequestQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Search, filters, amount/date ranges, sort and pagination are validated
    // by WithdrawalRequestQueryDto.
    return this.withdrawalRequestService.findAllWithdrawalRequest(
      query,
      user?.userId,
    );
  }

  // For getting a single withdrawal request by id.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single withdrawal request data.
    return this.withdrawalRequestService.findOneWithdrawalRequest(id);
  }


  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INVESTOR)
  create(
    @Body() createWithdrawalRequestDto: CreateWithdrawalRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.INVESTOR) {
      throw new ForbiddenException(
        'Only investors can request a withdrawal.',
      );
    }
    return this.withdrawalRequestService.createWithdrawalRequest(
      createWithdrawalRequestDto,
      user?.userId,
    );
  }

  // For cancelling an existing withdrawal request by id.
  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.INVESTOR) {
      throw new ForbiddenException(
        'Only investors can cancel a withdrawal request.',
      );
    }
    // Investors may only cancel an open request; the DTO rejects any other
    // field or status.
    return this.withdrawalRequestService.cancelWithdrawalRequest(
      user?.userId,
    );
  }

  // For deleting a withdrawal request by id.
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalRequestService.removeWithdrawalRequest(id);
  }
}
