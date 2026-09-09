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

    //For Creating Admin
    async create(createAdminDto: CreateAdminDto) {

        const { phone, email, phoneNumber } = createAdminDto;

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
