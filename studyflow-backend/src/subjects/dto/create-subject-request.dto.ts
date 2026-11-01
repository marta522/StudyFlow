import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSubjectRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  subject_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
