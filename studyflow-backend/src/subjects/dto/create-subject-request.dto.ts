import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubjectRequestDto {
  @IsString()
  @IsNotEmpty()
  subject_name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
