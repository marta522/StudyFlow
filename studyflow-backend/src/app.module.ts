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
