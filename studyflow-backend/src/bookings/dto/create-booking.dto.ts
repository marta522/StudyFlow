import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  lesson_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
