import { Module } from '@nestjs/common';
import { StudentTutorsController } from './student-tutors.controller';
import { PublicTutorsController } from './public-tutors.controller';
import { TutorsController } from './tutors.controller';
import { TutorsService } from './tutors.service';

@Module({
  controllers: [
    TutorsController,
    StudentTutorsController,
    PublicTutorsController,
  ],
  providers: [TutorsService],
})
export class TutorsModule {}
