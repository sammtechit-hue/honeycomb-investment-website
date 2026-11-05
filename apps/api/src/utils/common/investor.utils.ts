import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

export async function findInvestorId(
    prisma: PrismaService,
    userId: string,
): Promise<string> {
    const investor = await prisma.investor.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!investor) {
        throw new ForbiddenException('Invalid investor profile');
    }

    return investor.id;
}