import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateRefferalCodeDto } from './dto/create-refferal-code.dto';
import { UpdateRefferalCodeDto } from './dto/update-refferal-code.dto';
import { RefferalCodeService } from './refferal-code.service';

@Controller('refferal-code')
export class RefferalCodeController {
  // Inject RefferalCodeService to handle business logic.
  constructor(private readonly refferalCodeService: RefferalCodeService) {}

  // For getting all refferal codes with filtering, searching, sorting & pagination.
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // GET /refferal-code?search=ABC123&status=active&category=referral&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.refferalCodeService.findAll({
      search,
      status,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
    });
  }

  // For getting a single refferal code by id.
  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single refferal code data.
    return this.refferalCodeService.findOne(id);
  }

  // For creating a new refferal code.
  @Post()
  create(@Body() createRefferalCodeDto: CreateRefferalCodeDto) {
    return this.refferalCodeService.create(createRefferalCodeDto);
  }

  // For updating an existing refferal code by id.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRefferalCodeDto: UpdateRefferalCodeDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.refferalCodeService.update(id, updateRefferalCodeDto);
  }

  // For deleting a refferal code by id.
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.refferalCodeService.remove(id);
  }
}
