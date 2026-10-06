import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { SearchScheduleDto } from './dto/search-schedule.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLesson(tutorId: number, dto: CreateLessonDto) {
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException(
        'Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.',
      );
    }

    const lessonDate = new Date(`${dto.lesson_date}T00:00:00.000Z`);
    if (Number.isNaN(lessonDate.getTime()) || lessonDate < this.todayUtc()) {
      throw new BadRequestException(
        'Termin lekcji musi przypadać na dzisiejszy dzień lub później.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const tutorSubject = await tx.tutorSubject.findFirst({
            where: { tutor_id: tutorId, subject_id: dto.subject_id },
            include: { subject: true },
          });

          if (!tutorSubject || tutorSubject.subject.status !== 'ACTIVE') {
            throw new BadRequestException(
              'Możesz wystawić termin tylko dla aktywnego przedmiotu ze swojej oferty.',
            );
          }

          const overlappingLesson = await tx.lesson.findFirst({
            where: {
              tutor_id: tutorId,
              lesson_date: lessonDate,
              status: 'SCHEDULED',
              start_time: { lt: dto.end_time },
              end_time: { gt: dto.start_time },
            },
          });

          if (overlappingLesson) {
            throw new ConflictException(
              'Ten termin koliduje z inną zaplanowaną lekcją.',
            );
          }

          return tx.lesson.create({
            data: {
              tutor_id: tutorId,
              subject_id: dto.subject_id,
              lesson_date: lessonDate,
              start_time: dto.start_time,
              end_time: dto.end_time,
              created_by: tutorId,
              homework: dto.homework,
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
          'Termin koliduje z inną operacją. Odśwież kalendarz i spróbuj ponownie.',
        );
      }
      throw error;
    }
  }

  async updateLesson(tutorId: number, lessonId: number, dto: UpdateLessonDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const lesson = await tx.lesson.findUnique({
            where: { id_lessons: lessonId },
            include: { bookings: true },
          });
          if (!lesson || lesson.tutor_id !== tutorId) {
            throw new NotFoundException('Termin nie został znaleziony.');
          }
          if (lesson.status !== 'SCHEDULED' || lesson.bookings.length > 0) {
            throw new ConflictException(
              'Można edytować tylko wolne, zaplanowane terminy.',
            );
          }

          const subjectId = dto.subject_id ?? lesson.subject_id;
          const dateText =
            dto.lesson_date ?? lesson.lesson_date.toISOString().slice(0, 10);
          const lessonDate = new Date(`${dateText}T00:00:00.000Z`);
          const startTime = dto.start_time ?? lesson.start_time;
          const endTime = dto.end_time ?? lesson.end_time;

          if (
            Number.isNaN(lessonDate.getTime()) ||
            lessonDate < this.todayUtc() ||
            startTime >= endTime
          ) {
            throw new BadRequestException('Podano nieprawidłowy termin lekcji.');
          }

          const offer = await tx.tutorSubject.findFirst({
            where: {
              tutor_id: tutorId,
              subject_id: subjectId,
              subject: { status: 'ACTIVE' },
            },
            select: { id_tutor_subjects: true },
          });
          if (!offer) {
            throw new BadRequestException(
              'Przedmiot musi należeć do aktywnej oferty korepetytora.',
            );
          }

          const overlap = await tx.lesson.findFirst({
            where: {
              id_lessons: { not: lessonId },
              tutor_id: tutorId,
              lesson_date: lessonDate,
              status: 'SCHEDULED',
              start_time: { lt: endTime },
              end_time: { gt: startTime },
            },
            select: { id_lessons: true },
          });
          if (overlap) {
            throw new ConflictException(
              'Ten termin koliduje z inną zaplanowaną lekcją.',
            );
          }

          return tx.lesson.update({
            where: { id_lessons: lessonId },
            data: {
              subject_id: subjectId,
              lesson_date: lessonDate,
              start_time: startTime,
              end_time: endTime,
              ...(dto.homework !== undefined && { homework: dto.homework }),
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
          'Termin koliduje z inną operacją. Odśwież kalendarz i spróbuj ponownie.',
        );
      }
      throw error;
    }
  }

  async deleteLesson(tutorId: number, lessonId: number) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const lesson = await tx.lesson.findUnique({
            where: { id_lessons: lessonId },
            include: { bookings: true },
          });
          if (!lesson || lesson.tutor_id !== tutorId) {
            throw new NotFoundException('Termin nie został znaleziony.');
          }
          if (lesson.status !== 'SCHEDULED' || lesson.bookings.length > 0) {
            throw new ConflictException(
              'Można usunąć tylko wolne, zaplanowane terminy.',
            );
          }

          await tx.lesson.delete({ where: { id_lessons: lessonId } });
          return { id_lessons: lessonId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Termin jest właśnie rezerwowany. Odśwież kalendarz i spróbuj ponownie.',
        );
      }
      throw error;
    }
  }

  async getAvailableLessons() {
    return this.prisma.lesson.findMany({
      where: {
        status: 'SCHEDULED',
        lesson_date: { gte: this.todayUtc() },
        subject: { status: 'ACTIVE' },
        bookings: { none: { status: { not: 'CANCELLED' } } },
      },
      include: {
        tutor: {
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        subject: true,
      },
      orderBy: [{ lesson_date: 'asc' }, { start_time: 'asc' }],
    });
  }

  async bookLesson(studentId: number, dto: CreateBookingDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const lesson = await tx.lesson.findUnique({
            where: { id_lessons: dto.lesson_id },
            include: { bookings: true },
          });

          if (!lesson) {
            throw new NotFoundException('Lekcja nie istnieje.');
          }

          if (
            lesson.status !== 'SCHEDULED' ||
            lesson.lesson_date < this.todayUtc()
          ) {
            throw new ConflictException(
              'Ta lekcja nie jest już dostępna do rezerwacji.',
            );
          }

          if (lesson.tutor_id === studentId) {
            throw new ForbiddenException(
              'Nie możesz zarezerwować własnej lekcji.',
            );
          }

          if (
            lesson.bookings.some((booking) => booking.status !== 'CANCELLED')
          ) {
            throw new ConflictException(
              'Ta lekcja została już zarezerwowana przez kogoś innego.',
            );
          }

          return tx.booking.create({
            data: {
              lesson_id: dto.lesson_id,
              student_id: studentId,
              note: dto.note,
            },
            include: {
              lesson: {
                include: {
                  subject: true,
                  tutor: { select: { first_name: true, last_name: true } },
                },
              },
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
          'Ktoś właśnie zarezerwował ten termin. Odśwież listę dostępnych lekcji.',
        );
      }
      throw error;
    }
  }

  async getUserBookings(userId: number, role: string) {
    if (role === 'student') {
      return this.prisma.booking.findMany({
        where: { student_id: userId },
        include: {
          lesson: {
            include: {
              subject: true,
              tutor: {
                select: {
                  id_users: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { lesson: { lesson_date: 'asc' } },
      });
    }

    if (role === 'tutor') {
      return this.prisma.booking.findMany({
        where: { lesson: { tutor_id: userId } },
        include: {
          student: {
            select: { first_name: true, last_name: true, email: true },
          },
          lesson: { include: { subject: true } },
        },
        orderBy: { lesson: { lesson_date: 'asc' } },
      });
    }

    if (role === 'admin') {
      return this.prisma.booking.findMany({
        include: {
          student: { select: { first_name: true, last_name: true } },
          lesson: {
            include: {
              subject: true,
              tutor: { select: { first_name: true, last_name: true } },
            },
          },
        },
        orderBy: { lesson: { lesson_date: 'asc' } },
      });
    }

    throw new ForbiddenException('Brak dostępu do rezerwacji.');
  }

  async getAdminSchedule(query: SearchScheduleDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'Data początkowa nie może być późniejsza od daty końcowej.',
      );
    }

    const userSearch = query.user?.trim();
    return this.prisma.lesson.findMany({
      where: {
        ...(query.from && {
          lesson_date: { gte: new Date(`${query.from}T00:00:00.000Z`) },
        }),
        ...(query.to && {
          lesson_date: {
            ...(query.from && {
              gte: new Date(`${query.from}T00:00:00.000Z`),
            }),
            lte: new Date(`${query.to}T00:00:00.000Z`),
          },
        }),
        ...(query.subject_id !== undefined && {
          subject_id: query.subject_id,
        }),
        ...(userSearch && {
          OR: [
            {
              tutor: {
                OR: [
                  { first_name: { contains: userSearch, mode: 'insensitive' } },
                  { last_name: { contains: userSearch, mode: 'insensitive' } },
                  { email: { contains: userSearch, mode: 'insensitive' } },
                ],
              },
            },
            {
              bookings: {
                some: {
                  status: { not: 'CANCELLED' },
                  student: {
                    OR: [
                      {
                        first_name: {
                          contains: userSearch,
                          mode: 'insensitive',
                        },
                      },
                      {
                        last_name: {
                          contains: userSearch,
                          mode: 'insensitive',
                        },
                      },
                      {
                        email: {
                          contains: userSearch,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        }),
      },
      include: {
        tutor: {
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        subject: { select: { id_subjects: true, name: true } },
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            id_bookings: true,
            status: true,
            student: {
              select: {
                id_users: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ lesson_date: 'asc' }, { start_time: 'asc' }],
    });
  }

  private todayUtc(): Date {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
}
