import { Injectable } from '@nestjs/common';
import type {
    MonthlyProfitLedgerCreateInput,
    MonthlyProfitLedgerQuery,
    MonthlyProfitLedgerUpdateInput,
} from '@investment-platform/contracts/monthlyProfitLedger';

@Injectable()
export class MonthlyProfitLedgerService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) { }

    // For Getting One MonthlyProfitLedger's Data
    async findOne(id: string) {
        return id + 'This route is for MonthlyProfitLedger who will see their necessary data and partially modify data';
    }
}
