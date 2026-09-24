import { Injectable } from '@nestjs/common';
import type {
    AdminCreateInput,
    AdminQuery,
    AdminUpdateInput,
} from '@investment-platform/contracts/admin';

@Injectable()
export class AdminService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All Admin's Data with filtering, searching, sorting & pagination
    // Example: GET /admin?role=ADMIN&department=Operations&page=1&limit=10
    // Validated/normalized by AdminQueryDto — all fields are typed.
    async findAll(query: AdminQuery) {
        return {
            message: 'Return All Admins',
            query,
        };
    }

    // For Getting One Admin's Data
    async findOne(id: string) {
        return {
            message: `${id} - This route is for Admin who will see their necessary data and partially modify data`,
        };
    }

    // For Creating Admin
    // Validated by CreateAdminDto — includes `password`, which is hashed into
    // User.passwordHash and must never be echoed back in a response.
    async create(createAdminDto: AdminCreateInput) {
        const { email, role } = createAdminDto;

        return {
            message: 'Admin Created Successfully',
            email,
            role,
        };
    }

    // For updating Admin Information
    // AdminUpdateInput has no `password` — see UpdateAdminDto.
    async update(id: string, updateAdminDto: AdminUpdateInput) {
        return {
            message: 'Admin Updated Successfully',
            data: updateAdminDto,
        };
    }
}
