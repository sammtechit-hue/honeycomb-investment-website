import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateInvestmentDto {
    // Email is optional
    @IsEmail()
    @IsOptional()
    @MaxLength(150)
    email?: string;
}
