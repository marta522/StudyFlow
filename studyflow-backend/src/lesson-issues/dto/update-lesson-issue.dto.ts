import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLessonIssueDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_note?: string | null;
}
