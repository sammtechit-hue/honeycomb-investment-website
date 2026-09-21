import { Injectable } from '@nestjs/common';
import { CreateRefferalCodeDto } from './dto/create-refferal-code.dto';
import { UpdateRefferalCodeDto } from './dto/update-refferal-code.dto';
import { RefferalCodeQueryDto } from './dto/query-refferal-code.dto';

@Injectable()
export class RefferalCodeService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For getting all RefferalCode's data with filtering, searching, sorting & pagination.
  // Example: GET /refferal-code?search=ABC123&isUsed=false&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  async findAll(query: RefferalCodeQueryDto) {
    // Available filters: search, referrerId, referredId, isUsed,
    // expiresAfter, expiresBefore,
    // page, limit, sortBy, sortOrder
    const {
      search,
      referrerId,
      referredId,
      isUsed,
      expiresAfter,
      expiresBefore,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    return {
      message: "HelloWorld Return all RefferalCode's data",
    };
  }

  // For getting one RefferalCode's data.
  async findOne(id: string) {
    return id + 'This route is for RefferalCode who will see their necessary data and partially modify data';
  }

  // For creating RefferalCode.
  // Validated fields: code, referrerId, referredId, isUsed, expiresAt, usedAt
  async create(createRefferalCodeDto: CreateRefferalCodeDto) {
    const { code, referrerId } = createRefferalCodeDto;

    return {
      message: 'RefferalCode Created Successfully',
    };
  }

  // For updating RefferalCode information.
  // All fields optional — only provided fields are updated.
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
