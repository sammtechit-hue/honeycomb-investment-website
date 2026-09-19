import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from '../admin/project/dto/create-project.dto';
import { ProjectQueryDto } from '../admin/project/dto/query-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All Project's Data with filtering, searching, sorting & pagination
  // Example: GET /project?search=honeycomb&status=active&category=residential&page=1&limit=10
  async findAll(query: ProjectQueryDto) {
    const { search, status, isActive, isVisible, minInvestment, maxInvestment, page, limit, sortBy, sortOrder } = query;
    return search + 'Return all project List';
  }

  // For Getting One Project's Data
  async findOne(id: string) {
    return id + 'This route is for Project who will see their necessary data and partially modify data';
  }
}
