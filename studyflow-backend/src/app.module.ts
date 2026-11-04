import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { GradesModule } from './grades/grades.module';
import { PrismaModule } from './prisma/prisma.module';
import { BookingsModule } from './bookings/bookings.module';
import { SubjectsModule } from './subjects/subjects.module';
import { UsersModule } from './users/users.module';
import { TutorsModule } from './tutors/tutors.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LessonIssuesModule } from './lesson-issues/lesson-issues.module';
import { DEFAULT_TUTOR_SALARY_PERCENT } from './common/financial-constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        if (
          typeof config.DATABASE_URL !== 'string' ||
          config.DATABASE_URL.length === 0
        ) {
          throw new Error('DATABASE_URL must be configured.');
        }
        if (
          typeof config.JWT_SECRET !== 'string' ||
          config.JWT_SECRET.length < 32
        ) {
          throw new Error('JWT_SECRET must be at least 32 characters long.');
        }
        const salarySetting = config.TUTOR_SALARY_PERCENT;
        const tutorSalaryPercent =
          salarySetting === undefined
            ? DEFAULT_TUTOR_SALARY_PERCENT
            : typeof salarySetting === 'string' && salarySetting.trim() === ''
              ? Number.NaN
              : Number(salarySetting);
        if (
          !Number.isFinite(tutorSalaryPercent) ||
          tutorSalaryPercent < 0 ||
          tutorSalaryPercent > 100
        ) {
          throw new Error(
            'TUTOR_SALARY_PERCENT must be a number between 0 and 100.',
          );
        }
        try {
          new Intl.DateTimeFormat('en-US', {
            timeZone:
              typeof config.APP_TIMEZONE === 'string'
                ? config.APP_TIMEZONE
                : 'Europe/Warsaw',
          });
        } catch {
          throw new Error('APP_TIMEZONE must be a valid IANA timezone.');
        }
        return config;
      },
    }),
    PrismaModule,
    AuthModule,
    SubjectsModule,
    BookingsModule,
    AttendanceModule,
    GradesModule,
    UsersModule,
    TutorsModule,
    ReviewsModule,
    NotificationsModule,
    LessonIssuesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
