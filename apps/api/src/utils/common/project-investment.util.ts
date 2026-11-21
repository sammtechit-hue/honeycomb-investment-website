import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvestmentType, Prisma, ProjectStatus } from '@investment-platform/db';

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

// Loads the project an investor is putting money into, checks it can take
// this amount now, and works out the rate to store. A fixed-rate investment
// takes the project's rate; a variable one stores 0 and is paid at the
// monthly per-project rate. Used by the investor's own investment requests
// and by the investment inside an account application.
export async function resolveInvestmentTerms(
    db: Pick<Prisma.TransactionClient, 'project'>,
    input: { projectId: string; amount: number; investmentType: InvestmentType },
): Promise<{ amount: Prisma.Decimal; rate: Prisma.Decimal }> {
    const amount = new Prisma.Decimal(input.amount);
    const project = await db.project.findUnique({
        where: { id: input.projectId },
        select: {
            status: true,
            isActive: true,
            isVisible: true,
            startDate: true,
            endDate: true,
            minimumInvestment: true,
            maximumInvestment: true,
            projectRate: true,
        },
    });

    if (!project) {
        throw new NotFoundException('Project not found');
    }

    assertProjectAcceptsInvestment(project, amount);

    const rate =
        input.investmentType === InvestmentType.fixed && project.projectRate != null
            ? project.projectRate
            : new Prisma.Decimal(0);

    return { amount, rate };
}
