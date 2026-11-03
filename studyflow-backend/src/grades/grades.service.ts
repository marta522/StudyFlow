import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LIST_LIMIT } from '../common/pagination';
import { CreateGradeDto } from './dto/create-grade.dto';
import { getLessonEnd } from '../common/timezone';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async createGrade(tutorId: number, dto: CreateGradeDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id_lessons: dto.lesson_id,
        tutor_id: tutorId,
        status: { not: 'CANCELLED' },
        bookings: {
          some: {
            status: { not: 'CANCELLED' },
          },
        },
      },
      select: {
        id_lessons: true,
        lesson_date: true,
        start_time: true,
        end_time: true,
        subject_id: true,
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { student_id: true },
        },
      },
    });

    if (!lesson || lesson.bookings.length === 0) {
      throw new ForbiddenException(
        'Możesz ocenić tylko lekcję z aktywną rezerwacją u Ciebie.',
      );
    }

    const lessonEnd = getLessonEnd(lesson.lesson_date, lesson.end_time);
    if (lessonEnd > new Date()) {
      throw new ForbiddenException(
        'Ocenę można wystawić dopiero po zakończeniu lekcji.',
      );
    }

    const studentId = lesson.bookings[0].student_id;
    const lessonDate = new Date(lesson.lesson_date);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          return tx.monthlyGrade.create({
            data: {
              lesson_id: lesson.id_lessons,
              tutor_id: tutorId,
              student_id: studentId,
              subject_id: lesson.subject_id,
              month: lessonDate.getUTCMonth() + 1,
              year: lessonDate.getUTCFullYear(),
              grade: dto.grade,
              comment: dto.comment,
            },
            include: {
              subject: true,
              tutor: { select: { first_name: true, last_name: true } },
              lesson: { select: { lesson_date: true } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      ) {
        throw new ConflictException(
          'Uczeń ma już wystawioną ocenę z tego przedmiotu w danym miesiącu.',
        );
      }
      throw error;
    }
  }

  async getStudentGrades(studentId: number, requesterId: number, role: string) {
    if (role === 'student' && requesterId !== studentId) {
      throw new ForbiddenException('Możesz przeglądać tylko własne oceny.');
    }

    if (role === 'tutor') {
      const tutorHasStudent = await this.prisma.booking.findFirst({
        where: {
          student_id: studentId,
          status: { not: 'CANCELLED' },
          lesson: { tutor_id: requesterId },
        },
        select: { id_bookings: true },
      });

      if (!tutorHasStudent) {
        const studentExists = await this.prisma.user.findUnique({
          where: { id_users: studentId },
          select: { id_users: true },
        });
        if (!studentExists) {
          throw new NotFoundException('Uczeń nie został znaleziony.');
        }
        throw new ForbiddenException(
          'Możesz przeglądać oceny tylko uczniów z aktywną rezerwacją u Ciebie.',
        );
      }
    }

    return this.prisma.monthlyGrade.findMany({
      where: { student_id: studentId },
      include: {
        subject: true,
        tutor: { select: { first_name: true, last_name: true } },
        lesson: { select: { lesson_date: true } },
      },
      orderBy: { created_at: 'desc' },
      take: DEFAULT_LIST_LIMIT,
    });
  }
}
