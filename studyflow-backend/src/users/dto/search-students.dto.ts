import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchStudentsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
