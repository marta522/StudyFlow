import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @IsInt()
  @Min(1)
  subject_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  student_id?: number;

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
  @MaxLength(5000)
  homework?: string;
}
