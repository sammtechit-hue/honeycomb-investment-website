import { Injectable } from '@nestjs/common';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting One Admin's Data
    async findOne(id: string) {
        return id + "This route is for Admin who will see their necessary data and partially modify data";
    }

    async findAll({
        search,
        status,
        verified_kyc,
        category,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    }: {
        search?: string;
        status?: string;
        verified_kyc?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        return {
            message: "Return All Users"
        }
    }

    //For Creating Admin
    async create(createAdminDto: CreateAdminDto) {

        const { email } = createAdminDto;

        return {
            message: "User Created Successfully"
        }
    }

    // For updating Admin Information
    async update(id: string, updateAdminDto: UpdateAdminDto) {
        return {
            message: 'Admin Updated Successfully'
        }
    }

}
