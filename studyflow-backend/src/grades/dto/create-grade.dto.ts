import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGradeDto {
  @IsInt()
  @Min(1)
  student_id: number;

  @IsInt()
  @Min(1)
  subject_id: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(1)
  year: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(1)
  @Max(6)
  grade: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
