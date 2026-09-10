import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateNotificationDto {
    // Email is optional
    @IsEmail()
    @IsOptional()
    @MaxLength(150)
    email?: string;
}
