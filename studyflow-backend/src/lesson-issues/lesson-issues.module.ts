import { Module } from '@nestjs/common';
import { LessonIssuesController } from './lesson-issues.controller';
import { LessonIssuesService } from './lesson-issues.service';

@Module({
  controllers: [LessonIssuesController],
  providers: [LessonIssuesService],
})
export class LessonIssuesModule {}
