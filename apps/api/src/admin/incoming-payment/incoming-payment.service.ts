import { Injectable } from '@nestjs/common';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';

@Injectable()
export class IncomingPaymentService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All IncomingPayment's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/incoming-payment?search=bkash&status=pending&category=bkash&page=1&limit=10
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
            message: "HelloWorld Return all IncomingPayment's data",
        };
    }

    // For Getting One IncomingPayment's Data
    async findOne(id: string) {
        return id + 'This route is for IncomingPayment who will see their necessary data and partially modify data';
    }

    // For Creating IncomingPayment
    async create(createIncomingPaymentDto: CreateIncomingPaymentDto) {
        return {
            message: 'IncomingPayment Created Successfully',
        };
    }

    // For updating IncomingPayment Information
    async update(id: string, updateIncomingPaymentDto: UpdateIncomingPaymentDto) {
        return {
            message: 'IncomingPayment Updated Successfully',
        };
    }

    // For deleting IncomingPayment
    async remove(id: string) {
        return {
            message: 'IncomingPayment Deleted Successfully',
        };
    }
}
