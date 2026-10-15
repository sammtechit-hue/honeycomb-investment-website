import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, AdminNotificationType } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentQueryDto } from './dto/query-incoming-payment.dto';

const INCOMING_PAYMENT_CREATE_SELECT = {
  id: true,
  investmentId: true,
  amount: true,
  paymentMethod: true,
  screenshotUrl: true,
  senderAccountInfo: true,
  installmentNumber: true,
  dueDate: true,
  status: true,
  createdAt: true,
} satisfies Prisma.IncomingPaymentSelect;

@Injectable()
export class IncomingPaymentService {
  constructor(private readonly prisma: PrismaService) { }

  // For Getting All IncomingPayment's Data with filtering, searching, sorting & pagination
  // Example: GET /incoming-payment?status=pending&page=1&limit=20&sortBy=dueDate&sortOrder=desc
  async findAll(query: IncomingPaymentQueryDto) {
    return {
      message: "HelloWorld Return all IncomingPayment's data",
    };
  }

  // For Getting One IncomingPayment's Data
  async findOne(id: string) {
    return id + 'This route is for IncomingPayment who will see their necessary data and partially modify data';
  }

  // For Creating IncomingPayment — POST /api/incoming-payment. Investor
  async create(dto: CreateIncomingPaymentDto, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const amount = new Prisma.Decimal(dto.amount);

    const investment = await this.prisma.investment.findUnique({
      where: { id: dto.investmentId },
      select: {
        id: true,
        investor: { select: { userId: true } },
      },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    // Ownership scoping: 403 (not 404) for another investor's record so
    // investment IDs cannot be enumerated.
    if (investment.investor.userId !== userId) {
      throw new ForbiddenException(
        'Invalid investment!',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.incomingPayment.create({
          data: {
            amount,
            paymentMethod: dto.paymentMethod,
            screenshotUrl: dto.screenshotUrl,
            senderAccountInfo: dto.senderAccountInfo ?? null,
            installmentNumber: dto.installmentNumber ?? null,
            dueDate: dto.dueDate ?? null,
            status: 'pending',
            investment: { connect: { id: investment.id } },
          },
          // select: INCOMING_PAYMENT_CREATE_SELECT,
        });

        await tx.adminNotification.create({
          data: {
            type: 'incoming_payments' as AdminNotificationType,
            referenceId: payment.id,
            message: `New incoming payment: ${amount.toFixed(2)} via ${dto.paymentMethod} (Status: pending) is waiting for your manual review.`,
            isRead: false,
            clickLink: `/admin/incoming-payment/${payment.id}`,
          },
        });

        return {
          message: 'IncomingPayment Created Successfully',
          success: true,
          // data: payment,
        };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'One or more referenced records do not exist.',
        );
      }
      // P2000 = value too long for column (e.g. senderAccountInfo over
      // VARCHAR(150)). Surface as 400 instead of 500.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2000'
      ) {
        throw new BadRequestException(
          'One of the provided values is too long for its field.',
        );
      }
      throw err;
    }
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
