import { Injectable } from '@nestjs/common';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentQueryDto } from './dto/query-incoming-payment.dto';

@Injectable()
export class IncomingPaymentService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All IncomingPayment's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/incoming-payment?status=pending&page=1&limit=20&sortBy=dueDate&sortOrder=desc
    async findAll(query: IncomingPaymentQueryDto) {
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

    // For confirming/rejecting IncomingPayment (admin action)
    // POST /admin/incoming-payment/:id/confirm
    async confirm(id: string, status: 'pending' | 'confirmed' | 'overdue') {
        return {
            message: `IncomingPayment ${id} marked as ${status}`,
        };
    }

    // For deleting IncomingPayment
    async remove(id: string) {
        return {
            message: 'IncomingPayment Deleted Successfully',
        };
    }
}
