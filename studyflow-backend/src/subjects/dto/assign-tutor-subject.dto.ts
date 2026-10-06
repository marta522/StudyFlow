import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AssignTutorSubjectDto {
  @IsInt()
  @IsNotEmpty()
  subject_id: number;

  @IsNumber()
  @Min(0)
  price_per_hour: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  experience_years?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
