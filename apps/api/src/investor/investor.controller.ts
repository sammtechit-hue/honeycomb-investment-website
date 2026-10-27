import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  Ip,
  Headers,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';


@Controller('investor')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
export class InvestorController {
  constructor(private readonly investorService: InvestorService) { }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.investorService.findOne(user);
  }

  // POST /api/investor
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createInvestorDto: CreateInvestorDto,
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
    return this.investorService.createInvestor(createInvestorDto, user?.userId, context);
  }

  // PATCH /api/investor/:id/update
  @Post('update')
  async update(
    @Body() updateInvestorDto: UpdateInvestorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.investorService.updateInvestor(updateInvestorDto, user);
  }
}
