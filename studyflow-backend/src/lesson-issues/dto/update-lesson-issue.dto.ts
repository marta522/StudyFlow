import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LessonIssueStatus } from '../../common/statuses';

export class UpdateLessonIssueDto {
  @IsIn(Object.values(LessonIssueStatus))
  status: (typeof LessonIssueStatus)[keyof typeof LessonIssueStatus];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_note?: string | null;
}
