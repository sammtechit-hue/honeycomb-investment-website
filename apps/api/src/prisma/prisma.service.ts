import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@investment-platform/db';

// No onModuleInit $connect() — Prisma connects lazily on the first query,
// so the API still boots when DATABASE_URL isn't reachable yet (e.g. local
// dev before the DB is set up). Only the queries themselves will fail.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
