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
import { CreateAdminLessonDto } from './dto/create-admin-lesson.dto';
import { UpdateAdminLessonDto } from './dto/update-admin-lesson.dto';

@Injectable()
export class BookingsService {
  private readonly appTimeZone = process.env.APP_TIMEZONE ?? 'Europe/Warsaw';

  constructor(private readonly prisma: PrismaService) {}

  private rethrowTransactionError(
    error: unknown,
    conflictMessage = 'Termin koliduje z inną operacją. Odśwież kalendarz i spróbuj ponownie.',
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      throw new ConflictException(conflictMessage);
    }
    throw error;
  }

  async createLesson(tutorId: number, dto: CreateLessonDto) {
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException(
        'Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.',
      );
    }

    const lessonDate = new Date(`${dto.lesson_date}T00:00:00.000Z`);
    if (
      Number.isNaN(lessonDate.getTime()) ||
      lessonDate < this.todayInAppTimezone()
    ) {
      throw new BadRequestException(
        'Termin lekcji musi przypadać na dzisiejszy dzień lub później.',
      );
    }
    this.assertFutureLessonStart(lessonDate, dto.start_time);

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

          if (dto.student_id !== undefined) {
            const student = await tx.user.findFirst({
              where: {
                id_users: dto.student_id,
                status: 'ACTIVE',
                role: { name: 'student' },
                bookings_as_student: {
                  some: {
                    status: { not: 'CANCELLED' },
                    lesson: {
                      tutor_id: tutorId,
                      status: { not: 'CANCELLED' },
                    },
                  },
                },
              },
              select: { id_users: true },
            });
            if (!student) {
              throw new BadRequestException(
                'Możesz przypisać lekcję tylko aktywnemu uczniowi, który ma już rezerwację u Ciebie.',
              );
            }
          }

          await this.assertWithinTutorAvailability(
            tx,
            tutorId,
            lessonDate,
            dto.start_time,
            dto.end_time,
          );

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

          const lesson = await tx.lesson.create({
            data: {
              tutor_id: tutorId,
              subject_id: dto.subject_id,
              lesson_date: lessonDate,
              start_time: dto.start_time,
              end_time: dto.end_time,
              created_by: tutorId,
              homework: dto.homework,
              ...(dto.student_id !== undefined && {
                bookings: { create: { student_id: dto.student_id } },
              }),
            },
            include: {
              tutor: {
                select: { id_users: true, first_name: true, last_name: true },
              },
              subject: { select: { name: true } },
              bookings: {
                select: { student_id: true },
              },
            },
          });
          const notificationUserIds = new Set([
            tutorId,
            ...lesson.bookings.map((booking) => booking.student_id),
          ]);
          await Promise.all(
            [...notificationUserIds].map((userId) =>
              tx.notification.create({
                data: {
                  user_id: userId,
                  title: 'Dodano lekcję do harmonogramu',
                  message: `Dodano lekcję ${lesson.subject.name} ${lesson.lesson_date.toISOString().slice(0, 10)} (${lesson.start_time}–${lesson.end_time}).`,
                  type: 'LESSON_CREATED',
                },
              }),
            ),
          );
          await tx.adminAuditLog.create({
            data: {
              actor_id: tutorId,
              action: 'LESSON_CREATED',
              entity_type: 'lesson',
              entity_id: lesson.id_lessons,
              details: JSON.stringify({
                tutorId: lesson.tutor_id,
                subjectId: lesson.subject_id,
                lessonDate: lesson.lesson_date.toISOString().slice(0, 10),
                startTime: lesson.start_time,
                endTime: lesson.end_time,
              }),
            },
          });
          return lesson;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowTransactionError(error);
    }
  }

  async updateLesson(tutorId: number, lessonId: number, dto: UpdateLessonDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const lesson = await tx.lesson.findUnique({
            where: { id_lessons: lessonId },
            include: {
              subject: { select: { name: true } },
              bookings: {
                where: { status: { not: 'CANCELLED' } },
                select: { student_id: true },
              },
            },
          });
          if (!lesson || lesson.tutor_id !== tutorId) {
            throw new NotFoundException('Termin nie został znaleziony.');
          }
          if (lesson.status !== 'SCHEDULED') {
            throw new ConflictException(
              'Można edytować tylko zaplanowane lekcje.',
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
            lessonDate < this.todayInAppTimezone() ||
            startTime >= endTime
          ) {
            throw new BadRequestException(
              'Podano nieprawidłowy termin lekcji.',
            );
          }
          if (
            dateText !== lesson.lesson_date.toISOString().slice(0, 10) ||
            startTime !== lesson.start_time
          ) {
            this.assertFutureLessonStart(lessonDate, startTime);
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

          await this.assertWithinTutorAvailability(
            tx,
            tutorId,
            lessonDate,
            startTime,
            endTime,
          );

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

          const updatedLesson = await tx.lesson.update({
            where: { id_lessons: lessonId },
            data: {
              subject_id: subjectId,
              lesson_date: lessonDate,
              start_time: startTime,
              end_time: endTime,
              ...(dto.homework !== undefined && { homework: dto.homework }),
            },
          });
          await tx.adminAuditLog.create({
            data: {
              actor_id: tutorId,
              action: 'LESSON_UPDATED',
              entity_type: 'lesson',
              entity_id: lessonId,
              details: JSON.stringify({
                previous: {
                  subjectId: lesson.subject_id,
                  lessonDate: lesson.lesson_date.toISOString().slice(0, 10),
                  startTime: lesson.start_time,
                  endTime: lesson.end_time,
                },
                current: {
                  subjectId,
                  lessonDate: updatedLesson.lesson_date
                    .toISOString()
                    .slice(0, 10),
                  startTime,
                  endTime,
                },
              }),
            },
          });
          return updatedLesson;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowTransactionError(error);
    }
  }

  async deleteLesson(tutorId: number, lessonId: number) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const lesson = await tx.lesson.findUnique({
            where: { id_lessons: lessonId },
            include: {
              subject: { select: { name: true } },
              bookings: {
                where: { status: { not: 'CANCELLED' } },
                select: { student_id: true },
              },
            },
          });
          if (!lesson || lesson.tutor_id !== tutorId) {
            throw new NotFoundException('Termin nie został znaleziony.');
          }
          if (lesson.status !== 'SCHEDULED' || lesson.bookings.length > 0) {
            throw new ConflictException(
              'Można usunąć tylko wolne, zaplanowane terminy.',
            );
          }

          await tx.adminAuditLog.create({
            data: {
              actor_id: tutorId,
              action: 'LESSON_DELETED',
              entity_type: 'lesson',
              entity_id: lessonId,
              details: JSON.stringify({
                subject: lesson.subject.name,
                lessonDate: lesson.lesson_date.toISOString().slice(0, 10),
                startTime: lesson.start_time,
                endTime: lesson.end_time,
              }),
            },
          });
          await tx.lesson.delete({ where: { id_lessons: lessonId } });
          return { id_lessons: lessonId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowTransactionError(
        error,
        'Termin jest właśnie rezerwowany. Odśwież kalendarz i spróbuj ponownie.',
      );
    }
  }

  async createAdminLesson(adminId: number, dto: CreateAdminLessonDto) {
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException(
        'Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.',
      );
    }
    const lessonDate = new Date(`${dto.lesson_date}T00:00:00.000Z`);
    if (
      Number.isNaN(lessonDate.getTime()) ||
      lessonDate < this.todayInAppTimezone()
    ) {
      throw new BadRequestException(
        'Termin lekcji musi przypadać na dzisiejszy dzień lub później.',
      );
    }
    this.assertFutureLessonStart(lessonDate, dto.start_time);

    const transaction = this.prisma.$transaction(
      async (tx) => {
        const tutor = await tx.user.findFirst({
          where: {
            id_users: dto.tutor_id,
            status: 'ACTIVE',
            role: { name: 'tutor' },
          },
          select: { id_users: true },
        });
        if (!tutor) {
          throw new NotFoundException(
            'Aktywny korepetytor nie został znaleziony.',
          );
        }
        if (dto.student_id) {
          const student = await tx.user.findFirst({
            where: {
              id_users: dto.student_id,
              status: 'ACTIVE',
              role: { name: 'student' },
            },
            select: { id_users: true },
          });
          if (!student) {
            throw new NotFoundException('Aktywny uczeń nie został znaleziony.');
          }
        }
        const offer = await tx.tutorSubject.findFirst({
          where: {
            tutor_id: dto.tutor_id,
            subject_id: dto.subject_id,
            subject: { status: 'ACTIVE' },
          },
          select: { id_tutor_subjects: true },
        });
        if (!offer) {
          throw new BadRequestException(
            'Przedmiot musi należeć do aktywnej oferty korepetytora.',
          );
        }
        await this.assertWithinTutorAvailability(
          tx,
          dto.tutor_id,
          lessonDate,
          dto.start_time,
          dto.end_time,
        );
        await this.assertNoOverlappingLesson(
          tx,
          dto.tutor_id,
          lessonDate,
          dto.start_time,
          dto.end_time,
        );

        const lesson = await tx.lesson.create({
          data: {
            tutor_id: dto.tutor_id,
            subject_id: dto.subject_id,
            lesson_date: lessonDate,
            start_time: dto.start_time,
            end_time: dto.end_time,
            created_by: adminId,
            homework: dto.homework,
            ...(dto.student_id && {
              bookings: { create: { student_id: dto.student_id } },
            }),
          },
          include: {
            tutor: {
              select: { id_users: true, first_name: true, last_name: true },
            },
            subject: { select: { id_subjects: true, name: true } },
            bookings: {
              include: {
                student: {
                  select: { id_users: true, first_name: true, last_name: true },
                },
              },
            },
          },
        });
        const notificationUserIds = new Set([
          lesson.tutor.id_users,
          ...lesson.bookings.map((booking) => booking.student.id_users),
        ]);
        await Promise.all(
          [...notificationUserIds].map((userId) =>
            tx.notification.create({
              data: {
                user_id: userId,
                title: 'Dodano lekcję do harmonogramu',
                message: `Dodano lekcję ${lesson.subject.name} ${lesson.lesson_date.toISOString().slice(0, 10)} (${lesson.start_time}–${lesson.end_time}).`,
                type: 'LESSON_CREATED',
              },
            }),
          ),
        );
        await tx.adminAuditLog.create({
          data: {
            actor_id: adminId,
            action: 'LESSON_CREATED',
            entity_type: 'lesson',
            entity_id: lesson.id_lessons,
            details: JSON.stringify({
              tutorId: lesson.tutor_id,
              subjectId: lesson.subject_id,
              lessonDate: lesson.lesson_date.toISOString().slice(0, 10),
              startTime: lesson.start_time,
              endTime: lesson.end_time,
            }),
          },
        });
        return lesson;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return transaction.catch((error: unknown) =>
      this.rethrowTransactionError(error),
    );
  }

  async updateAdminLesson(
    adminId: number,
    lessonId: number,
    dto: UpdateAdminLessonDto,
  ) {
    const transaction = this.prisma.$transaction(
      async (tx) => {
        const lesson = await tx.lesson.findUnique({
          where: { id_lessons: lessonId },
          include: {
            subject: { select: { name: true } },
            bookings: {
              where: { status: { not: 'CANCELLED' } },
              select: { student_id: true },
            },
          },
        });
        if (!lesson) {
          throw new NotFoundException('Termin nie został znaleziony.');
        }
        if (lesson.status !== 'SCHEDULED') {
          throw new ConflictException(
            'Można edytować tylko zaplanowane lekcje.',
          );
        }
        const tutorId = dto.tutor_id ?? lesson.tutor_id;
        const subjectId = dto.subject_id ?? lesson.subject_id;
        const dateText =
          dto.lesson_date ?? lesson.lesson_date.toISOString().slice(0, 10);
        const lessonDate = new Date(`${dateText}T00:00:00.000Z`);
        const startTime = dto.start_time ?? lesson.start_time;
        const endTime = dto.end_time ?? lesson.end_time;
        if (
          Number.isNaN(lessonDate.getTime()) ||
          lessonDate < this.todayInAppTimezone() ||
          startTime >= endTime
        ) {
          throw new BadRequestException('Podano nieprawidłowy termin lekcji.');
        }
        if (
          dateText !== lesson.lesson_date.toISOString().slice(0, 10) ||
          startTime !== lesson.start_time
        ) {
          this.assertFutureLessonStart(lessonDate, startTime);
        }
        const tutor = await tx.user.findFirst({
          where: {
            id_users: tutorId,
            status: 'ACTIVE',
            role: { name: 'tutor' },
          },
          select: { id_users: true },
        });
        if (!tutor) {
          throw new NotFoundException(
            'Aktywny korepetytor nie został znaleziony.',
          );
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
        await this.assertWithinTutorAvailability(
          tx,
          tutorId,
          lessonDate,
          startTime,
          endTime,
        );
        await this.assertNoOverlappingLesson(
          tx,
          tutorId,
          lessonDate,
          startTime,
          endTime,
          lessonId,
        );
        const updatedLesson = await tx.lesson.update({
          where: { id_lessons: lessonId },
          data: {
            tutor_id: tutorId,
            subject_id: subjectId,
            lesson_date: lessonDate,
            start_time: startTime,
            end_time: endTime,
            ...(dto.homework !== undefined && { homework: dto.homework }),
          },
        });
        const changed = [
          lesson.tutor_id !== tutorId,
          lesson.subject_id !== subjectId,
          lessonDate.getTime() !== lesson.lesson_date.getTime(),
          startTime !== lesson.start_time,
          endTime !== lesson.end_time,
        ].some(Boolean);
        if (changed) {
          const notificationUserIds = new Set([
            lesson.tutor_id,
            tutorId,
            ...lesson.bookings.map((booking) => booking.student_id),
          ]);
          const changes: string[] = [];
          if (lesson.tutor_id !== tutorId) changes.push('korepetytor');
          if (lesson.subject_id !== subjectId) changes.push('przedmiot');
          if (lessonDate.getTime() !== lesson.lesson_date.getTime())
            changes.push('data');
          if (startTime !== lesson.start_time || endTime !== lesson.end_time)
            changes.push('godzina');
          await Promise.all(
            [...notificationUserIds].map((userId) =>
              tx.notification.create({
                data: {
                  user_id: userId,
                  title: 'Zmieniono termin lekcji',
                  message: `Administrator zmienił ${changes.join(', ')} lekcji ${lesson.subject.name}. Nowy termin: ${updatedLesson.lesson_date.toISOString().slice(0, 10)} (${updatedLesson.start_time}–${updatedLesson.end_time}).`,
                  type: 'LESSON_UPDATED',
                },
              }),
            ),
          );
          await tx.adminAuditLog.create({
            data: {
              actor_id: adminId,
              action: 'LESSON_UPDATED',
              entity_type: 'lesson',
              entity_id: lessonId,
              details: JSON.stringify({
                previous: {
                  tutorId: lesson.tutor_id,
                  subjectId: lesson.subject_id,
                  lessonDate: lesson.lesson_date.toISOString().slice(0, 10),
                  startTime: lesson.start_time,
                  endTime: lesson.end_time,
                },
                current: {
                  tutorId,
                  subjectId,
                  lessonDate: updatedLesson.lesson_date
                    .toISOString()
                    .slice(0, 10),
                  startTime,
                  endTime,
                },
              }),
            },
          });
        }
        return updatedLesson;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return transaction.catch((error: unknown) =>
      this.rethrowTransactionError(error),
    );
  }

  async cancelAdminLesson(lessonId: number, adminId: number) {
    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id_lessons: lessonId },
        include: {
          subject: { select: { name: true } },
          tutor: { select: { id_users: true } },
          bookings: {
            where: { status: { not: 'CANCELLED' } },
            select: { student_id: true },
          },
        },
      });
      if (!lesson) {
        throw new NotFoundException('Termin nie został znaleziony.');
      }
      if (lesson.status === 'COMPLETED') {
        throw new ConflictException('Nie można anulować ukończonej lekcji.');
      }
      if (lesson.status === 'CANCELLED') {
        throw new ConflictException('Ta lekcja została już odwołana.');
      }
      const [updatedLesson, bookings] = await Promise.all([
        tx.lesson.update({
          where: { id_lessons: lessonId },
          data: {
            status: 'CANCELLED',
            cancelled_by: adminId,
            cancelled_at: new Date(),
          },
        }),
        tx.booking.updateMany({
          where: { lesson_id: lessonId, status: { not: 'CANCELLED' } },
          data: { status: 'CANCELLED' },
        }),
      ]);
      const notificationUserIds = new Set([
        lesson.tutor.id_users,
        ...lesson.bookings.map((booking) => booking.student_id),
      ]);
      await Promise.all(
        [...notificationUserIds].map((userId) =>
          tx.notification.create({
            data: {
              user_id: userId,
              title: 'Lekcja została odwołana',
              message: `Lekcja ${lesson.subject.name} ${lesson.lesson_date.toISOString().slice(0, 10)} (${lesson.start_time}–${lesson.end_time}) została odwołana przez administratora.`,
              type: 'LESSON_CANCELLED',
            },
          }),
        ),
      );
      await tx.adminAuditLog.create({
        data: {
          actor_id: adminId,
          action: 'LESSON_CANCELLED',
          entity_type: 'lesson',
          entity_id: lessonId,
          details: JSON.stringify({
            subject: lesson.subject.name,
            lessonDate: lesson.lesson_date.toISOString().slice(0, 10),
            startTime: lesson.start_time,
            endTime: lesson.end_time,
          }),
        },
      });
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCancellationCount = await tx.lesson.count({
        where: {
          status: 'CANCELLED',
          cancelled_at: { gte: sevenDaysAgo },
        },
      });
      if (recentCancellationCount >= 5) {
        const admins = await tx.user.findMany({
          where: { role: { name: 'admin' }, status: 'ACTIVE' },
          select: { id_users: true },
        });
        await Promise.all(
          admins.map(async (admin) => {
            const recentAlert = await tx.notification.findFirst({
              where: {
                user_id: admin.id_users,
                type: 'ADMIN_CANCELLATION_SPIKE',
                created_at: { gte: sevenDaysAgo },
              },
              select: { id_notifications: true },
            });
            if (recentAlert) return;
            await tx.notification.create({
              data: {
                user_id: admin.id_users,
                title: 'Wzrost liczby odwołanych lekcji',
                message: `W ciągu ostatnich 7 dni odwołano ${recentCancellationCount} lub więcej lekcji. Sprawdź harmonogram i ustal, czy potrzebna jest reakcja.`,
                type: 'ADMIN_CANCELLATION_SPIKE',
              },
            });
          }),
        );
      }
      return { lesson: updatedLesson, cancelledBookings: bookings.count };
    });
  }

  async getAvailableLessons() {
    return this.prisma.lesson.findMany({
      where: {
        status: 'SCHEDULED',
        lesson_date: { gte: this.todayInAppTimezone() },
        subject: { status: 'ACTIVE' },
        bookings: { none: { status: { not: 'CANCELLED' } } },
      },
      include: {
        tutor: {
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
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
            lesson.lesson_date < this.todayInAppTimezone()
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

          if (!this.isLessonStartInFuture(lesson.lesson_date, lesson.start_time)) {
            throw new ConflictException(
              'Ta lekcja nie jest już dostępna do rezerwacji.',
            );
          }

          const booking = await tx.booking.create({
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
          await tx.notification.create({
            data: {
              user_id: lesson.tutor_id,
              title: 'Nowa rezerwacja lekcji',
              message: `Uczeń zarezerwował lekcję ${booking.lesson.subject.name} ${booking.lesson.lesson_date.toISOString().slice(0, 10)} (${booking.lesson.start_time}–${booking.lesson.end_time}).`,
              type: 'LESSON_BOOKED',
            },
          });
          return booking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowTransactionError(
        error,
        'Ktoś właśnie zarezerwował ten termin. Odśwież listę dostępnych lekcji.',
      );
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
              cancelled_by_user: {
                select: { first_name: true, last_name: true },
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
            select: {
              id_users: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          lesson: {
            include: {
              subject: true,
              cancelled_by_user: {
                select: { first_name: true, last_name: true },
              },
              tutor: {
                select: { id_users: true, first_name: true, last_name: true },
              },
              monthly_grades: {
                select: {
                  id_monthly_grades: true,
                  student_id: true,
                },
              },
            },
          },
          attendance: true,
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
              cancelled_by_user: {
                select: { first_name: true, last_name: true },
              },
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
        ...(query.status && { status: query.status }),
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
        ...(query.tutor_id !== undefined && { tutor_id: query.tutor_id }),
        ...(query.student_id !== undefined && {
          bookings: {
            some: {
              student_id: query.student_id,
              status: { not: 'CANCELLED' },
            },
          },
        }),
        ...(userSearch && {
          OR: [
            {
              tutor: {
                OR: [
                  { first_name: { contains: userSearch } },
                  { last_name: { contains: userSearch } },
                  { email: { contains: userSearch } },
                ],
              },
            },
            {
              bookings: {
                some: {
                  student: {
                    OR: [
                      {
                        first_name: {
                          contains: userSearch,
                        },
                      },
                      {
                        last_name: {
                          contains: userSearch,
                        },
                      },
                      {
                        email: {
                          contains: userSearch,
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
        cancelled_by_user: {
          select: { first_name: true, last_name: true },
        },
        bookings: {
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

  private getDateParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.appTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: string): number => {
      const part = parts.find((item) => item.type === type);
      if (!part) throw new Error(`Missing ${type} in timezone date parts.`);
      return Number(part.value);
    };
    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
      second: value('second'),
    };
  }

  private todayInAppTimezone(): Date {
    const { year, month, day } = this.getDateParts(new Date());
    return new Date(Date.UTC(year, month - 1, day));
  }

  private getLessonStart(
    lessonDate: Date,
    startTime: string,
  ): Date | null {
    const [year, month, day] = lessonDate
      .toISOString()
      .slice(0, 10)
      .split('-')
      .map(Number);
    const [hour, minute] = startTime.split(':').map(Number);
    const wallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    let timestamp = wallTimeAsUtc;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const local = this.getDateParts(new Date(timestamp));
      const representedLocalTime = Date.UTC(
        local.year,
        local.month - 1,
        local.day,
        local.hour,
        local.minute,
        local.second,
      );
      timestamp = wallTimeAsUtc - (representedLocalTime - timestamp);
    }

    const lessonStart = new Date(timestamp);
    const resolved = this.getDateParts(lessonStart);
    if (
      resolved.year !== year ||
      resolved.month !== month ||
      resolved.day !== day ||
      resolved.hour !== hour ||
      resolved.minute !== minute
    ) {
      return null;
    }
    return lessonStart;
  }

  private isLessonStartInFuture(lessonDate: Date, startTime: string): boolean {
    const lessonStart = this.getLessonStart(lessonDate, startTime);
    return lessonStart !== null && lessonStart.getTime() > Date.now();
  }

  private assertFutureLessonStart(lessonDate: Date, startTime: string): void {
    const lessonStart = this.getLessonStart(lessonDate, startTime);
    if (lessonStart === null) {
      throw new BadRequestException(
        'Podana godzina nie istnieje w wybranej strefie czasowej.',
      );
    }
    if (lessonStart.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Godzina rozpoczęcia lekcji musi przypadać w przyszłości.',
      );
    }
  }

  private async assertWithinTutorAvailability(
    tx: Prisma.TransactionClient,
    tutorId: number,
    lessonDate: Date,
    startTime: string,
    endTime: string,
  ) {
    const dayByNumber = [
      'Niedziela',
      'Poniedziałek',
      'Wtorek',
      'Środa',
      'Czwartek',
      'Piątek',
      'Sobota',
    ];
    const dayOfWeek = dayByNumber[lessonDate.getUTCDay()];
    const availability = await tx.availability.findFirst({
      where: {
        tutor_id: tutorId,
        day_of_week: dayOfWeek,
        is_active: true,
        start_time: { lte: startTime },
        end_time: { gte: endTime },
      },
      select: { id_availability: true },
    });
    if (!availability) {
      throw new BadRequestException(
        'Termin lekcji musi mieścić się w zdefiniowanej dostępności korepetytora.',
      );
    }
  }

  private async assertNoOverlappingLesson(
    tx: Prisma.TransactionClient,
    tutorId: number,
    lessonDate: Date,
    startTime: string,
    endTime: string,
    excludedLessonId?: number,
  ) {
    const overlap = await tx.lesson.findFirst({
      where: {
        tutor_id: tutorId,
        lesson_date: lessonDate,
        status: 'SCHEDULED',
        start_time: { lt: endTime },
        end_time: { gt: startTime },
        ...(excludedLessonId !== undefined && {
          id_lessons: { not: excludedLessonId },
        }),
      },
      select: { id_lessons: true },
    });
    if (overlap) {
      throw new ConflictException(
        'Ten termin koliduje z inną zaplanowaną lekcją.',
      );
    }
  }
}
