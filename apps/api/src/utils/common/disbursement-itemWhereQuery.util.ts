import type { ExportFormat, Prisma } from '@investment-platform/db';

interface BuildDisbursementItemWhereParams {
    search?: string;
    batchId?: string;
    investmentId?: string;
    investorId?: string;
    exportFormat?: ExportFormat;
    snapshotBankName?: string;
    minAmount?: number;
    maxAmount?: number;
}

export function buildDisbursementItemWhere({
    search,
    batchId,
    investmentId,
    investorId,
    exportFormat,
    snapshotBankName,
    minAmount,
    maxAmount,
}: BuildDisbursementItemWhereParams): Prisma.DisbursementItemWhereInput {
    return {
        ...(batchId && { batchId }),
        ...(investmentId && { investmentId }),
        ...(investorId && { investorId }),
        ...(exportFormat && { exportFormat }),
        ...(snapshotBankName && {
            snapshotBankName: { contains: snapshotBankName, mode: 'insensitive' },
        }),
        ...((minAmount !== undefined || maxAmount !== undefined) && {
            amount: {
                ...(minAmount !== undefined && { gte: minAmount }),
                ...(maxAmount !== undefined && { lte: maxAmount }),
            },
        }),
        ...(search && {
            OR: [
                { reason: { contains: search, mode: 'insensitive' } },
                { snapshotBankName: { contains: search, mode: 'insensitive' } },
                { snapshotAccountName: { contains: search, mode: 'insensitive' } },
                { snapshotAccountNumber: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };
}
