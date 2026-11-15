import { BadRequestException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@investment-platform/db';

// Shape of the project fields `assertProjectAcceptsInvestment` needs. Select
// these fields when loading the project before calling it.
export interface ProjectInvestmentEligibility {
    status: ProjectStatus;
    isActive: boolean;
    isVisible: boolean;
    startDate: Date;
    endDate: Date | null;
    minimumInvestment: Prisma.Decimal;
    maximumInvestment: Prisma.Decimal | null;
}

// Shared by the investor and admin investment-create flows so both enforce the
// same "can this project take this investment right now" rules.
export function assertProjectAcceptsInvestment(
    project: ProjectInvestmentEligibility,
    amount: Prisma.Decimal,
): void {
    if (
        !project.isActive ||
        !project.isVisible ||
        project.status !== ProjectStatus.OPEN
    ) {
        throw new BadRequestException(
            'This project is not currently open for investment.',
        );
    }

    const now = new Date();
    if (project.startDate > now) {
        throw new BadRequestException('This project has not opened yet.');
    }
    if (project.endDate && project.endDate < now) {
        throw new BadRequestException(
            'This project is no longer accepting investments.',
        );
    }

    if (amount.lt(project.minimumInvestment)) {
        throw new BadRequestException(
            `Amount must be at least ${project.minimumInvestment.toFixed(2)}.`,
        );
    }
}
