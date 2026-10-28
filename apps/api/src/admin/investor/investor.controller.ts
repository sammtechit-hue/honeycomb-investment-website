import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorQueryDto } from './dto/query-investor.dto';
import {
  BankAccountQueryDto,
  UpdateInvestorBankAccountDto,
} from './dto/bankaccount';
import {
  InvestorEditRequestQueryDto,
  InvestorEditRequestReviewDto,
} from './dto/InvestorEditRequest';
import { InvestorService } from './investor.service';

@Controller('admin/investor')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class InvestorController {
  constructor(private readonly investorService: InvestorService) { }

  // GET /api/admin/investor?search=john&status=active&category=gold&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestorQueryDto) {
    return this.investorService.findAll(query);
  }  // GET /api/admin/investor/edit-requests?search=&status=PENDING&investorId=&page=1&limit=10&sortBy=createdAt&sortOrder=desc


  @Get('edit-requests')
  findAllEditRequests(@Query() query: InvestorEditRequestQueryDto) {
    return this.investorService.findAllEditRequests(query);
  }

  // GET /api/admin/investor/edit-requests/:id
  @Get('edit-requests/:id')
  @HttpCode(HttpStatus.OK)
  findInvestorEditRequests(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.findInvestorEditRequests(id);
  }

  // GET /api/admin/investor/:id/bank-account
  @Get(':id/bank-account')
  @HttpCode(HttpStatus.OK)
  findInvestorBankAccounts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BankAccountQueryDto,
  ) {
    return this.investorService.findInvestorBankAccounts(id, query);
  }

  // PATCH /api/admin/investor/bank-account/:bankAccountId
  @Patch('bank-account/:bankAccountId')
  @HttpCode(HttpStatus.OK)
  updateInvestorBankAccount(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Body() dto: UpdateInvestorBankAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.investorService.updateInvestorBankAccount(
      bankAccountId,
      dto,
      user.userId,
      { ipAddress: ip, userAgent, sessionId },
    );
  }

  // GET /api/admin/investor/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.findOne(id);
  }


  // PATCH /api/admin/investor/edit-requests/:id
  @Patch('edit-requests/:id')
  @HttpCode(HttpStatus.OK)
  reviewInvestorEditRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvestorEditRequestReviewDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const context = {
      ipAddress: ip,
      userAgent: userAgent,
      sessionId: sessionId,
    };
    return this.investorService.reviewInvestorEditRequests(
      id,
      dto,
      user.userId,
      context,
    );
  }

  // POST /api/admin/investor
  @Post()
  create(@Body() createInvestorDto: CreateInvestorDto) {
    return this.investorService.create(createInvestorDto);
  }

  // PATCH /api/admin/investor/:id
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const context = {
      ipAddress: ip,
      userAgent: userAgent,
      sessionId: sessionId,
    };
    return this.investorService.updateInvestor(
      id,
      updateInvestorDto,
      user.userId,
      context,
    );
  }

  // PATCH /api/admin/investor/:id/deactivate  (sets status to 'deactivated')
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const context = {
      ipAddress: ip,
      userAgent: userAgent,
      sessionId: sessionId,
    };
    return this.investorService.deactiveInvestor(id, user.userId, context);
  }
}
