import { Injectable } from '@nestjs/common';
// import { UpdateMonthlyRateSettingDto } from './dto/update-monthly-rate-setting.dto';
// import { CreateMonthlyRateSettingDto } from './dto/create-monthly-rate-setting.dto';

@Injectable()
export class MonthlyRateSettingService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All Monthly Rate Settings with filtering, searching, sorting & pagination
    // Example: GET /admin/monthly-rate-setting?search=january&status=active&category=gold&page=1&limit=10
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
            message: "Return all Monthly Rate Settings data",
        };
    }

    // For Getting One Monthly Rate Setting's Data
    async findOne(id: string) {
        return id + "Return a single monthly rate setting's data";
    }

    // For Creating Monthly Rate Setting
    // async create(createMonthlyRateSettingDto: CreateMonthlyRateSettingDto) {
    //     const {
    //         month,
    //         year,
    //         rate,
    //     } = createMonthlyRateSettingDto;

    //     return {
    //         message: 'Monthly Rate Setting Created successfully',
    //     };
    // }

    // For Updating Monthly Rate Setting
    // async update(id: string, updateMonthlyRateSettingDto: UpdateMonthlyRateSettingDto) {
    //     return {
    //         message: 'Monthly Rate Setting updated successfully'
    //     };
    // }

    // For Deleting Monthly Rate Setting
    // async remove(id: string) {
    //     return {
    //         message: 'Monthly Rate Setting deleted successfully'
    //     };
    // }
}
