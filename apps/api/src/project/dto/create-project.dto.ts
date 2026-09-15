import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsUrl,
} from 'class-validator';

// import { ProjectStatus } from '@prisma/client';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Project title is required' })
  @MinLength(2, { message: 'Title must be at least 2 characters' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Location cannot exceed 200 characters' })
  location?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsEnum(ProjectStatus, {
    message: 'Status must be one of: draft, active, completed, archived',
  })
  @IsOptional()
  status?: ProjectStatus = ProjectStatus.DRAFT;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  investorId?: string;

  /**
   * Reference to the admin who created the project
   * @internal - set by system / auth context
   */
  @IsString()
  @IsOptional()
  createdById?: string;
}
