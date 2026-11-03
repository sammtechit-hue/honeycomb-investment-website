import type { PayoutStatus, Prisma } from '@investment-platform/db';

interface BuildMonthlyProfitLedgerWhereParams {
    investorId: string;
    investmentId?: string;
    search?: string;
    payoutStatus?: PayoutStatus;
    min?: number;
    max?: number;
    periodFrom?: Date;
    periodTo?: Date;
}

export function buildMonthlyProfitLedgerWhere({
    investorId,
    investmentId,
    search,
    payoutStatus,
    min,
    max,
    periodFrom,
    periodTo,
}: BuildMonthlyProfitLedgerWhereParams): Prisma.MonthlyProfitLedgerWhereInput {
    return {
        investment: {
            investorId,
            ...(investmentId && { id: investmentId }),
            ...(search && {
                project: {
                    name: { contains: search, mode: 'insensitive' },
                },
            }),
        },
        ...(payoutStatus && { payoutStatus }),
        ...((min !== undefined || max !== undefined) && {
            profitAmount: {
                ...(min !== undefined && { gte: min }),
                ...(max !== undefined && { lte: max }),
            },
        }),
        ...((periodFrom !== undefined || periodTo !== undefined) && {
            ...(periodFrom !== undefined && {
                cycleStart: { gte: periodFrom },
            }),
            ...(periodTo !== undefined && {
                cycleEnd: { lte: periodTo },
            }),
        }),
    };
}