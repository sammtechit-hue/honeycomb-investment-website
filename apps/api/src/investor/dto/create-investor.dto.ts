import {
    IsString,
    IsEmail,
    IsOptional,
    IsEnum,
    MaxLength,
    MinLength,
    IsNotEmpty,
    Matches,
} from 'class-validator';

// import { InvestorCategory, InvestorStatus, KycDocType } from '@prisma/client';

export class CreateInvestorDto {

    @IsString()
    @IsNotEmpty({ message: 'Full name is required' })
    @MinLength(2, { message: 'Full name must be at least 2 characters' })
    @MaxLength(30, { message: 'Full name cannot exceed 30 characters' })
    fullName: string;

    // Email
    @IsEmail()
    @IsOptional()
    @MaxLength(150)
    email?: string;

    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Address cannot exceed 100 characters' })
    address?: string;

    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Profession cannot exceed 150 characters' })
    profession?: string;

    // @IsEnum(InvestorCategory, {
    //     message: 'Category must be one of: bronze, silver, gold, diamond, platinum, titanium',
    // })
    // @IsOptional()
    // category?: InvestorCategory = InvestorCategory.bronze;

    //     @IsEnum(InvestorStatus, {
    //     message: 'Status must be one of: pending, uploaded_kyc, active, suspended',
    //   })
    //   @IsOptional()
    //   status?: InvestorStatus = InvestorStatus.pending;

    @IsString()
    @IsOptional()
    approvedById?: string;


    /**
   * Reference to the application user account (for login/auth)
   * This links the investor profile to the authentication system
   * Created automatically during registration
   * 
   * @internal - This should be set by the system during user creation
   */
    @IsString()
    @IsOptional()
    adminId?: string;
}

export class kycDocumentDto {

    // @IsEnum(KycDocType, {
    //     message: 'Document type must be one of: nid, photo, other',
    // })
    // @IsNotEmpty({ message: 'Document type is required' })
    // docType: KycDocType;

    @IsString()
    @IsNotEmpty({ message: 'File URL is required' })
    fileUrl: string;
}