import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    AuditAction,
    LogModule,
    LogSeverity,
    LogStatus,
    Prisma,
} from '@investment-platform/db';
import type { ReferralQuery } from '@investment-platform/contracts/referral';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import { ReferralQueryDto } from './dto/query-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';

const REFERRAL_LIST_SELECT = {
    id: true,
    bonusPercent: true,
    // Referral bonus amount.
    bonusAmount: true,
    createdAt: true,
    // Which code was used.
    referralCode: {
        select: { id: true, code: true },
    },
    // Who referred.
    referrer: {
        select: { id: true, fullname: true },
    },
    // Who was referred.
    referredInvestor: {
        select: { id: true, fullname: true },
    },
} as const satisfies Prisma.ReferralSelect;

// A referral row with its code, as returned by findUnique/update below.
type ReferralWithCode = Prisma.ReferralGetPayload<{
    include: { referralCode: { select: { id: true; code: true } } };
}>;

const REFERRAL_CODE_INCLUDE = {
    referralCode: { select: { id: true, code: true } },
} as const;

@Injectable()
export class ReferralService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        private readonly prisma: PrismaService,
    ) { }

    private readonly sortColumns = {
        bonusAmount: 'bonusAmount',
        createdAt: 'createdAt',
    } as const satisfies Record<
        ReferralQuery['sortBy'],
        keyof Prisma.ReferralOrderByWithRelationInput
    >;

    // Example: GET /api/admin/referral?search=ABC123 or 'Rahim'&referrerId=&referredInvestorId=
    //   &minBonusAmount=&maxBonusAmount=&fromDate=&toDate=
    //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
    async findAllReferral(query: ReferralQueryDto) {
        const {
            search,
            referrerId,
            referredInvestorId,
            minBonusAmount,
            maxBonusAmount,
            fromDate,
            toDate,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        const where: Prisma.ReferralWhereInput = {
            ...(referrerId && { referrerId }),
            ...(referredInvestorId && { referredInvestorId }),
            ...(search && {
                OR: [
                    // The code itself (e.g. ABC123) is the common lookup.
                    {
                        referralCode: {
                            code: { contains: search, mode: 'insensitive' },
                        },
                    },
                    // Who referred, or who was referred, matched by full name.
                    {
                        referrer: {
                            fullname: { contains: search, mode: 'insensitive' },
                        },
                    },
                    {
                        referredInvestor: {
                            fullname: { contains: search, mode: 'insensitive' },
                        },
                    },
                ],
            }),
            ...((minBonusAmount !== undefined || maxBonusAmount !== undefined) && {
                bonusAmount: {
                    ...(minBonusAmount !== undefined && { gte: minBonusAmount }),
                    ...(maxBonusAmount !== undefined && { lte: maxBonusAmount }),
                },
            }),
            ...((fromDate !== undefined || toDate !== undefined) && {
                createdAt: {
                    ...(fromDate !== undefined && { gte: fromDate }),
                    ...(toDate !== undefined && { lte: toDate }),
                },
            }),
        };

        // Reuse the Order function. The id tie-breaker keeps pages deterministic.
        const orderBy = buildOrderBy<Prisma.ReferralOrderByWithRelationInput>(
            this.sortColumns[sortBy],
            sortOrder,
        );

        // Reuse the fetch function — current page and total count in parallel.
        const [referrals, total] = await fetchData(
            this.prisma.referral,
            where,
            orderBy,
            page,
            limit,
            { select: REFERRAL_LIST_SELECT },
        );

        return {
            message: 'Referrals fetched successfully',
            success: true,
            data: referrals,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // PATCH /api/admin/referral/:id — partial update.
    async updateReferral(
        id: string,
        dto: UpdateReferralDto,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const {
            bonusPercent,
            bonusAmount,
        } = dto;

        // Prisma skips `undefined` keys, so only fields the client sent are written.
        const data: Prisma.ReferralUncheckedUpdateInput = {
            bonusPercent:
                bonusPercent !== undefined ? new Prisma.Decimal(bonusPercent) : undefined,
            bonusAmount:
                bonusAmount !== undefined ? new Prisma.Decimal(bonusAmount) : undefined,
        };

        if (Object.values(data).every((value) => value === undefined)) {
            throw new BadRequestException('No fields provided to update');
        }

        // For the audit log: who is acting, and the row as it stands before the edit.
        const [adminProfile, existingReferral] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.referral.findUnique({
                where: { id },
                include: {
                    referralCode: { select: { id: true, code: true } },
                },
            }),
        ]);

        if (!adminProfile) {
            throw new NotFoundException('Admin profile not found');
        }

        if (!existingReferral) {
            throw new NotFoundException(`Referral with id ${id} not found`);
        }

        try {
            // The row and its audit trail are written together or not at all.
            const referral = await this.prisma.$transaction(async (tx) => {
                const updated = await tx.referral.update({
                    where: { id },
                    data,
                    include: REFERRAL_CODE_INCLUDE,
                });

                await tx.auditLog.create({
                    data: {
                        adminName: adminProfile.name ?? 'Admin',
                        adminProfileId: adminProfile.id,
                        action: AuditAction.referral_updated,
                        module: LogModule.REFERRAL,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Referral Updated: ${updated.referralCode.code}`,
                        targetTable: 'referrals',
                        targetId: updated.id,
                        oldValue: toReferralSnapshot(existingReferral),
                        newValue: toReferralSnapshot(updated),
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });

                return updated;
            });

            return {
                message: 'Referral updated successfully',
                success: true,
                data: referral,
            };
        } catch (err) {
            // Only translate the Prisma errors we can explain; anything else is a 500.
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2025') {
                    throw new NotFoundException(`Referral with id ${id} not found`);
                }
                if (err.code === 'P2002') {
                    throw new ConflictException(
                        'This investor or referral code is already used by another referral.',
                    );
                }
                if (err.code === 'P2003') {
                    throw new BadRequestException(
                        'One or more referenced records do not exist.',
                    );
                }
            }
            throw err;
        }
    }
}

// Referral scalars only, JSON-ready: Decimals as numbers, Dates as ISO strings.
function toReferralSnapshot(referral: ReferralWithCode): Prisma.InputJsonObject {
    return {
        id: referral.id,
        referrerId: referral.referrerId,
        referredInvestorId: referral.referredInvestorId,
        referralCodeId: referral.referralCodeId,
        bonusPercent:
            referral.bonusPercent !== null ? Number(referral.bonusPercent) : null,
        bonusAmount:
            referral.bonusAmount !== null ? Number(referral.bonusAmount) : null,
        createdAt: referral.createdAt.toISOString(),
    };
}
