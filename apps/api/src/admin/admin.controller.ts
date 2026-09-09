import { Body, Controller, Get, Param, Post, Patch, Delete } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) { }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.adminService.update(id, updateAdminDto);
  }



}
