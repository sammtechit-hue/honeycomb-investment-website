import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateRoiCalculatorLeadDto } from './dto/create-roi-calculator-lead.dto';
import { UpdateRoiCalculatorLeadDto } from './dto/update-roi-calculator-lead.dto';
import { RoiCalculatorLeadService } from './roi-calculator-lead.service';

@Controller('roi-calculator-lead')
export class RoiCalculatorLeadController {
  constructor(private readonly roiCalculatorLeadService: RoiCalculatorLeadService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('followedUp') followedUp?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // GET /roi-calculator-lead?search=john&status=pending&category=lead&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.roiCalculatorLeadService.findAll({
      search,
      status,
      category,
      followedUp: followedUp !== undefined ? followedUp === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single ROI calculator lead data
    return this.roiCalculatorLeadService.findOne(id);
  }

  @Post()
  create(@Body() createRoiCalculatorLeadDto: CreateRoiCalculatorLeadDto) {
    return this.roiCalculatorLeadService.create(createRoiCalculatorLeadDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoiCalculatorLeadDto: UpdateRoiCalculatorLeadDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.roiCalculatorLeadService.update(id, updateRoiCalculatorLeadDto);
  }

  // For updating followedUp status — admin follow-up tracking
  @Patch(':id/followed-up')
  updateFollowedUp(@Param('id') id: string, @Body() body: { followedUp: boolean }) {
    return this.roiCalculatorLeadService.updateFollowedUp(id, body.followedUp);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roiCalculatorLeadService.remove(id);
  }
}
