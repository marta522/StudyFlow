import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AssignTutorSubjectDto {
  @IsInt()
  @Min(1)
  subject_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price_per_hour: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  experience_years?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
