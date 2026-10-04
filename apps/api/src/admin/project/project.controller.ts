import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Headers,
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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/query-project.dto';
import { ProjectService } from './project.service';

// Admin project endpoints — list/filter, read, create, update and delete.
// ADMIN, MODERATOR and SUPER_ADMIN may view, update and delete projects; only
// ADMIN and SUPER_ADMIN may create them (see the method-level @Roles on create,
// which overrides this class-level list). SUPER_ADMIN always passes the
// RolesGuard (see roles.guard.ts), so it's never listed explicitly. A missing
// @Roles would deny everyone, because RolesGuard denies by default.
// Validation is scoped to this controller (@UsePipes): the global
// class-validator pipe strips every field on zod DTOs. See main.ts.
@Controller('admin/project')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
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
    // Create a new project record. Only ADMIN and SUPER_ADMIN may create
    // projects — this method-level @Roles overrides the class-level
    // @Roles(Role.ADMIN, Role.MODERATOR), so MODERATOR is denied here.
    @Post()
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    create(
        @Body() createProjectDto: CreateProjectDto,
        @CurrentUser() user: AuthenticatedUser,
        @Ip() ip?: string,
        @Headers('user-agent') userAgent?: string,
        @Headers('x-session-id') sessionId?: string,
    ) {
        const context = {
            ipAddress: ip,
            userAgent: userAgent,
            sessionId: sessionId,
        }

        // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
        return this.projectService.create(createProjectDto, user?.userId, context);
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
