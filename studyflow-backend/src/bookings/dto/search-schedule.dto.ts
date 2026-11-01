import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class SearchScheduleDto {
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subject_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tutor_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  user?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
  status?: string;
}
