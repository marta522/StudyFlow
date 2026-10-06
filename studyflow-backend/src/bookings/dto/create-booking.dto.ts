import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  lesson_id: number;

  @IsOptional()
  @IsString()
  note?: string;
}
