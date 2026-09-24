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
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminQueryDto } from './dto/query-admin.dto';
import { AdminService } from './admin.service';

// Admin account endpoints — the `AdminProfile` + `User` pair behind the back
// office. Investor management lives under /admin/investor.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('admin/account')
@UsePipes(ZodValidationPipe)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // For getting all admin accounts with filtering, searching, sorting &
  // pagination.
  // GET /api/admin?search=rakib&role=ADMIN&department=Operations
  //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: AdminQueryDto) {
    // Search, filters, sort and pagination are validated by AdminQueryDto.
    return this.adminService.findAll(query);
  }

  // GET /api/admin/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOne(id);
  }

  // POST /api/admin
  // Creates the User (credentials) and its 1:1 AdminProfile; role defaults to
  // "ADMIN" and only admin roles are accepted.
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  // PATCH /api/admin/:id
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.adminService.update(id, updateAdminDto);
  }
}
