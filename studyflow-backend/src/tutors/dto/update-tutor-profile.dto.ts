import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTutorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  about_me?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  experience?: string | null;
}
