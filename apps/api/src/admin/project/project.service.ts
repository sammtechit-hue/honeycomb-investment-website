import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All Project's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/project?search=deed&status=active&category=certificate&page=1&limit=10
    async findAll({
        search,
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    }: {
        search?: string;
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        return {
            message: "HelloWorld Return all Project's data",
        };
    }

    // For Getting One Project's Data
    async findOne(id: string) {
        return id + 'This route is for Project who will see their necessary data and partially modify data';
    }

    // For Creating Project
    // Expected fields (to be added to the DTO): name, description, etc.
    async create(createProjectDto: CreateProjectDto) {
        return {
            message: 'Project Created Successfully',
        };
    }

    // For updating Project Information
    async update(id: string, updateProjectDto: UpdateProjectDto) {
        return {
            message: 'Project Updated Successfully',
        };
    }

    // For deleting Project
    async remove(id: string) {
        return {
            message: 'Project Deleted Successfully',
        };
    }
}
