import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDisbursementBatchDto {
    // Slot is optional - one of the 4 fixed windows
    @IsOptional()
    @IsString()
    @IsEnum(['slot_1', 'slot_2', 'slot_3', 'slot_4'])
    slot?: string;

    // Human-readable display label, e.g. "1st-8th"
    @IsOptional()
    @IsString()
    @MaxLength(50)
    slotLabel?: string;

    // Batch date - stored as Date
    @IsOptional()
    @IsDateString()
    batchDate?: string;

    // Export type - cbl / beftn / other
    @IsOptional()
    @IsString()
    @IsEnum(['cbl', 'beftn', 'other'])
    exportType?: string;

    // File URL is optional - generated Excel file
    @IsOptional()
    @IsString()
    fileUrl?: string;

    // Status is optional - defaults to draft
    @IsOptional()
    @IsString()
    @IsEnum(['draft', 'exported', 'confirmed'])
    status?: string;
}
