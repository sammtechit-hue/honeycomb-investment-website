import { Injectable } from '@nestjs/common';
import { CreateRefferalCodeDto } from './dto/create-refferal-code.dto';
import { UpdateRefferalCodeDto } from './dto/update-refferal-code.dto';

@Injectable()
export class RefferalCodeService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For getting all RefferalCode's data with filtering, searching, sorting & pagination.
  // Example: GET /refferal-code?search=ABC123&status=active&category=referral&page=1&limit=10
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
      message: "HelloWorld Return all RefferalCode's data",
    };
  }

  // For getting one RefferalCode's data.
  async findOne(id: string) {
    return id + 'This route is for RefferalCode who will see their necessary data and partially modify data';
  }

  // For creating RefferalCode.
  async create(createRefferalCodeDto: CreateRefferalCodeDto) {
    return {
      message: 'RefferalCode Created Successfully',
    };
  }

  // For updating RefferalCode information.
  async update(id: string, updateRefferalCodeDto: UpdateRefferalCodeDto) {
    return {
      message: 'RefferalCode Updated Successfully',
    };
  }

  // For deleting RefferalCode.
  async remove(id: string) {
    return {
      message: 'RefferalCode Deleted Successfully',
    };
  }
}
