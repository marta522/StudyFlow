import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  subject_id?: number;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  lesson_date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time?: string;

  @IsOptional()
  @IsString()
  homework?: string;
}
