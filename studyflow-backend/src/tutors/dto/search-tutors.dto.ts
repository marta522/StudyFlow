import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class SearchTutorsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subject_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  min_rating?: number;

  @IsOptional()
  @IsDateString()
  available_date?: string;

  @IsOptional()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  available_from?: string;

  @IsOptional()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  available_to?: string;
}
