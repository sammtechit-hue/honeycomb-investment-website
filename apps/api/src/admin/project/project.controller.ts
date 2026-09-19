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
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/query-project.dto';
import { ProjectService } from './project.service';

// Scoped to this controller only — matches the zod-based admin/investor
// controller. See main.ts for why validation pipes are opt-in per controller.
@Controller('admin/project')
@UsePipes(ZodValidationPipe)
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
    ) { }

    // GET /api/admin/project?search=deed&status=OPEN&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: ProjectQueryDto) {
        // Search, filter, sort and pagination are validated by ProjectQueryDto.
        return this.projectService.findAll(query);
    }

    // GET /api/admin/project/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single project data
        return this.projectService.findOne(id);
    }

    // POST /api/admin/project
    @Post()
    create(@Body() createProjectDto: CreateProjectDto) {
        // Create a new project record
        return this.projectService.create(createProjectDto);
    }

    // PATCH /api/admin/project/:id
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateProjectDto: UpdateProjectDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.projectService.update(id, updateProjectDto);
    }

    // DELETE /api/admin/project/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete a project by id
        return this.projectService.remove(id);
    }
}
