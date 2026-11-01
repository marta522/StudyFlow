import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGradeDto {
  @IsInt()
  @Min(1)
  lesson_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(1)
  @Max(6)
  grade: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}
