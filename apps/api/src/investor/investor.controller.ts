import {
  Body,
  Controller,
  ForbiddenException,
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

  // GET /api/investor/:id
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assertOwnInvestorRecord(id, user);
    return this.investorService.findOne(id);
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
    return this.investorService.create(createInvestorDto, user?.userId, context);
  }

  // PATCH /api/investor/:id
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assertOwnInvestorRecord(id, user);
    return this.investorService.update(id, updateInvestorDto);
  }

  // Blocks an investor from reading/writing another investor's record by
  // guessing/enumerating UUIDs (IDOR). SUPER_ADMIN bypasses this — RolesGuard
  // already lets them past @Roles(Role.INVESTOR) on every route, so this
  // check has to agree or it'd re-block them right after. A missing record
  // gets the same 403 as someone else's, so the response can't be used to
  // probe which investor ids exist.
  private async assertOwnInvestorRecord(
    investorId: string,
    user: AuthenticatedUser,
  ) {
    if (user.role === Role.SUPER_ADMIN) return;

    const ownerUserId = await this.investorService.findOwnerUserId(investorId);
    if (ownerUserId === null || ownerUserId !== user.userId) {
      throw new ForbiddenException(
        'You may only access your own investor profile.',
      );
    }
  }
}
