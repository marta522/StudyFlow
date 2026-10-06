import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async createGrade(tutorId: number, dto: CreateGradeDto) {
    const studentLesson = await this.prisma.lesson.findFirst({
      where: {
        tutor_id: tutorId,
        subject_id: dto.subject_id,
        status: 'COMPLETED',
        bookings: {
          some: {
            student_id: dto.student_id,
            status: { not: 'CANCELLED' },
          },
        },
      },
      select: { id_lessons: true },
    });

    if (!studentLesson) {
      throw new ForbiddenException(
        'Możesz oceniać tylko ucznia, z którym odbyłeś lekcję z tego przedmiotu.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingGrade = await tx.monthlyGrade.findFirst({
            where: {
              student_id: dto.student_id,
              subject_id: dto.subject_id,
              month: dto.month,
              year: dto.year,
            },
            select: { id_monthly_grades: true },
          });
          if (existingGrade) {
            throw new ConflictException(
              'Uczeń ma już ocenę z tego przedmiotu za wybrany miesiąc.',
            );
          }

          return tx.monthlyGrade.create({
            data: {
              tutor_id: tutorId,
              student_id: dto.student_id,
              subject_id: dto.subject_id,
              month: dto.month,
              year: dto.year,
              grade: dto.grade,
              comment: dto.comment,
            },
            include: {
              subject: true,
              tutor: { select: { first_name: true, last_name: true } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Ocena za ten miesiąc została właśnie dodana. Odśwież dane ucznia.',
        );
      }
      throw error;
    }
  }

  async getStudentGrades(studentId: number, requesterId: number, role: string) {
    if (role === 'student' && requesterId !== studentId) {
      throw new ForbiddenException('Możesz przeglądać tylko własne oceny.');
    }

    const where =
      role === 'tutor'
        ? { student_id: studentId, tutor_id: requesterId }
        : { student_id: studentId };

    if (role === 'tutor') {
      const tutorHasGrades = await this.prisma.monthlyGrade.findFirst({
        where,
        select: { id_monthly_grades: true },
      });

      if (!tutorHasGrades) {
        const student = await this.prisma.user.findUnique({
          where: { id_users: studentId },
          select: { id_users: true },
        });
        if (!student) {
          throw new NotFoundException('Uczeń nie został znaleziony.');
        }
        return [];
      }
    }

    return this.prisma.monthlyGrade.findMany({
      where,
      include: {
        subject: true,
        tutor: { select: { first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
