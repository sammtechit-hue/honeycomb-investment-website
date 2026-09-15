import { Injectable } from '@nestjs/common';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';

@Injectable()
export class WithdrawalRequestService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All WithdrawalRequest's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/withdrawal-request?search=pending&status=pending&category=manual&page=1&limit=10
    async findAll({
        search,
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        min,
        max,
    }: {
        search?: string;
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        min?: number;
        max?: number;
    }) {
        return {
            message: "HelloWorld Return all WithdrawalRequest's data",
        };
    }

    // For Getting One WithdrawalRequest's Data
    async findOne(id: string) {
        return id + 'This route is for WithdrawalRequest who will see their necessary data and partially modify data';
    }

    // For Creating WithdrawalRequest
    // Expected fields (to be added to the DTO): investorId, amount, method, etc.
    async create(createWithdrawalRequestDto: CreateWithdrawalRequestDto) {
        return {
            message: 'WithdrawalRequest Created Successfully',
        };
    }

    // For updating WithdrawalRequest Information
    async update(id: string, updateWithdrawalRequestDto: UpdateWithdrawalRequestDto) {
        return {
            message: 'WithdrawalRequest Updated Successfully',
        };
    }

    // For deleting WithdrawalRequest
    async remove(id: string) {
        return {
            message: 'WithdrawalRequest Deleted Successfully',
        };
    }
}
