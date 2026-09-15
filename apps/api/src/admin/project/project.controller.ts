import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@Controller('admin/project')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
    ) { }

    // GET /admin/project?search=deed&status=active&category=certificate&page=1&limit=10&sortBy=createdAt&sortOrder=desc
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
        // GET /admin/project?search=deed&status=active&category=certificate&page=1&limit=10&sortBy=createdAt&sortOrder=desc
        return this.projectService.findAll({
            search,
            status,
            category,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            sortBy: sortBy ?? 'createdAt',
            sortOrder: sortOrder ?? 'desc',
        });
    }

    // GET /admin/project/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        // Return a single project data
        return this.projectService.findOne(id);
    }

    // POST /admin/project
    @Post()
    create(@Body() createProjectDto: CreateProjectDto) {
        // Create a new project record
        return this.projectService.create(createProjectDto);
    }

    // PATCH /admin/project/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.projectService.update(id, updateProjectDto);
    }

    // DELETE /admin/project/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        // Delete a project by id
        return this.projectService.remove(id);
    }
}
