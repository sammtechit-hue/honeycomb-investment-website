import { IsEmail, IsOptional, MaxLength, Matches } from 'class-validator';
import { BD_PHONE_MESSAGE, BD_PHONE_REGEX } from '../../utils/validators/bdPhoneNumberVaildation';

export class CreateAdminDto {
    // Email is optional
    @IsEmail()
    @IsOptional()
    @MaxLength(150)
    email?: string;
    
    // Phone Number is Vaildation  
    @Matches(BD_PHONE_REGEX, { message: BD_PHONE_MESSAGE })
    phone?: string;
}
