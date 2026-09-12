import { IsString, IsNotEmpty } from 'class-validator';
import { createZodDto } from 'nestjs-zod';
import { investorCreateInputSchema } from '@investment-platform/contracts/investor';

// Validated against the same schema secure-web uses for the investor form.
// See packages/contracts/src/investor.ts for the shared source of truth.
export class CreateInvestorDto extends createZodDto(investorCreateInputSchema) {}

// Not yet migrated to the shared schema — kept as-is for now.
export class kycDocumentDto {
    @IsString()
    @IsNotEmpty({ message: 'File URL is required' })
    fileUrl: string;
}
