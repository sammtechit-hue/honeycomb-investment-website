import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/query-project.dto';

@Injectable()
export class ProjectService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All Project's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/project?search=deed&status=OPEN&page=1&limit=10
    async findAll(query: ProjectQueryDto) {
        // Available filters: search, status, isActive, isVisible,
        // minInvestment, maxInvestment, fromDate, toDate,
        // page, limit, sortBy, sortOrder
        const { search, status, isActive, isVisible, minInvestment, maxInvestment, page, limit, sortBy, sortOrder } = query;

        return {
            message: "HelloWorld Return all Project's data",
        };
    }

    // For Getting One Project's Data
    async findOne(id: string) {
        return id + 'This route is for Project who will see their necessary data and partially modify data';
    }

    // For Creating Project
    // Validated fields: name, description, status, minimumInvestment,
    // maximumInvestment, targetAmount, startDate, endDate, isActive, isVisible
    // (totalInvestedAmount is server-managed and never client-submitted)
    async create(createProjectDto: CreateProjectDto) {
        return {
            message: 'Project Created Successfully',
        };
    }

    // For updating Project Information
    // All fields optional — only provided fields are updated.
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
