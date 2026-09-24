import { Body, Controller, Get, ParseUUIDPipe, Param, UsePipes, Query } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProjectQueryDto } from '../admin/project/dto/query-project.dto';

@Controller('project')
@UsePipes(ZodValidationPipe)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  findAll(@Query() query: ProjectQueryDto
  ) {
    // GET /project?search=honeycomb&status=active&category=residential&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.projectService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.findOne(id);
  }

}
