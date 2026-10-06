import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @IsInt()
  @Min(1)
  subject_id: number;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  lesson_date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time: string;

  @IsOptional()
  @IsString()
  homework?: string;
}
