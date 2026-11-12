import { randomInt } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@investment-platform/db';

export async function generateUniqueReferralCode(
    tx: Prisma.TransactionClient,
): Promise<string> {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let attempt = 0; attempt < 10; attempt++) {
        let code = 'HC';
        for (let i = 0; i < 6; i++) {
            code += alphabet[randomInt(alphabet.length)];
        }

        const clash = await tx.referralCode.findUnique({
            where: { code },
            select: { id: true },
        });
        if (!clash) return code;
    }

    throw new ConflictException(
        'Could not generate a unique referral code. Please retry.',
    );
}
