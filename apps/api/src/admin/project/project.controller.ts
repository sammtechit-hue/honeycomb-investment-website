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


@Controller('admin/project')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
    ) { }

    //   GET /api/admin/project?search=deed&status=OPEN&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    @HttpCode(HttpStatus.OK)
    findAll(@Query() query: ProjectQueryDto) {
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

        // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
        return this.projectService.update(id, updateProjectDto, user?.userId, context);
    }

    // DELETE /api/admin/project/:id
    // Destructive: only ADMIN may delete (SUPER_ADMIN passes via RolesGuard).
    // MODERATOR is denied here even though the class allows ADMIN + MODERATOR.
    @Delete(':id')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthenticatedUser,
        @Ip() ip?: string,
        @Headers('user-agent') userAgent?: string,
        @Headers('x-session-id') sessionId?: string,
    ) {
        // Delete a project by id
        const context = {
            ipAddress: ip,
            userAgent: userAgent,
            sessionId: sessionId,
        };

        // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
        return this.projectService.remove(id, user?.userId, context);
    }
}
