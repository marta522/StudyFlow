import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { fromCents, lessonCostInCents } from '../common/money';
import { DEFAULT_LIST_LIMIT } from '../common/pagination';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { GenerateFinancialReportDto } from './dto/generate-financial-report.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { SearchAuditLogDto } from './dto/search-audit-log.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findStudents(requesterId: number, role: string, search?: string) {
    const normalizedSearch = search?.trim();
    return this.prisma.user.findMany({
      where: {
        role: { name: 'student' },
        ...(normalizedSearch && {
          OR: [
            { first_name: { contains: normalizedSearch } },
            { last_name: { contains: normalizedSearch } },
            { email: { contains: normalizedSearch } },
          ],
        }),
        ...(role === 'tutor' && {
          bookings_as_student: {
            some: {
              status: { not: 'CANCELLED' },
              lesson: {
                tutor_id: requesterId,
                status: { not: 'CANCELLED' },
              },
            },
          },
        }),
      },
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        status: true,
      },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      take: DEFAULT_LIST_LIMIT,
    });
  }

  findStudentsAndTutors() {
    return this.prisma.user.findMany({
      where: { role: { name: { in: ['student', 'tutor'] } } },
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        status: true,
        role: { select: { name: true } },
      },
      orderBy: [{ role: { name: 'asc' } }, { last_name: 'asc' }],
      take: DEFAULT_LIST_LIMIT,
    });
  }

  async createManagedUser(adminId: number, dto: CreateManagedUserDto) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
      select: { id_roles: true },
    });
    if (!role) {
      throw new NotFoundException('Wybrana rola nie istnieje.');
    }

    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            first_name: dto.first_name.trim(),
            last_name: dto.last_name.trim(),
            email: dto.email.trim().toLowerCase(),
            password_hash: passwordHash,
            phone: dto.phone?.trim() || null,
            role_id: role.id_roles,
          },
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            status: true,
            role: { select: { name: true } },
          },
        });
        await tx.adminAuditLog.create({
          data: {
            actor_id: adminId,
            action: 'USER_CREATED',
            entity_type: 'user',
            entity_id: user.id_users,
            details: JSON.stringify({ email: user.email, role: dto.role }),
          },
        });
        return user;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Użytkownik o podanym adresie email już istnieje.',
        );
      }
      throw error;
    }
  }

  async getDashboardMetrics() {
    const [
      studentCount,
      activeStudentCount,
      tutorCount,
      activeTutorCount,
      reviewStats,
      pendingRequests,
      lessons,
      rates,
      cancelledLessonCount,
      upcomingLessons,
      pendingRequestItems,
      recentlyCancelledLessons,
      tutorAvailability,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { name: 'student' } } }),
      this.prisma.user.count({
        where: { role: { name: 'student' }, status: 'ACTIVE' },
      }),
      this.prisma.user.count({ where: { role: { name: 'tutor' } } }),
      this.prisma.user.count({
        where: { role: { name: 'tutor' }, status: 'ACTIVE' },
      }),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
      this.prisma.subjectRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.lesson.findMany({
        where: {
          status: 'COMPLETED',
          bookings: { some: { status: { not: 'CANCELLED' } } },
        },
        select: {
          lesson_date: true,
          start_time: true,
          end_time: true,
          tutor_id: true,
          subject_id: true,
          subject: { select: { name: true } },
        },
      }),
      this.prisma.tutorSubject.findMany({
        select: {
          tutor_id: true,
          subject_id: true,
          price_per_hour_cents: true,
        },
      }),
      this.prisma.lesson.count({ where: { status: 'CANCELLED' } }),
      this.prisma.lesson.findMany({
        where: {
          status: 'SCHEDULED',
          lesson_date: {
            gte: new Date(new Date().toISOString().slice(0, 10)),
            lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          tutor: { select: { first_name: true, last_name: true } },
          subject: { select: { name: true } },
          bookings: {
            where: { status: { not: 'CANCELLED' } },
            include: { student: { select: { first_name: true, last_name: true } } },
          },
        },
        orderBy: [{ lesson_date: 'asc' }, { start_time: 'asc' }],
      }),
      this.prisma.subjectRequest.findMany({
        where: { status: 'PENDING' },
        include: { tutor: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'asc' },
        take: 8,
      }),
      this.prisma.lesson.findMany({
        where: {
          status: 'CANCELLED',
          cancelled_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        include: {
          tutor: { select: { first_name: true, last_name: true } },
          subject: { select: { name: true } },
        },
        orderBy: { cancelled_at: 'desc' },
        take: 8,
      }),
      this.prisma.availability.findMany({
        where: { is_active: true, tutor: { status: 'ACTIVE' } },
        select: {
          tutor_id: true,
          start_time: true,
          end_time: true,
          tutor: { select: { first_name: true, last_name: true } },
        },
      }),
    ]);

    const rateByTutorAndSubject = new Map(
      rates.map((rate) => [
        `${rate.tutor_id}:${rate.subject_id}`,
        rate.price_per_hour_cents,
      ]),
    );
    const year = new Date().getUTCFullYear();
    const monthlyRevenue = Array.from({ length: 12 }, (_, month) => ({
      month: month + 1,
      revenueCents: 0,
    }));
    const lessonCountsBySubject = new Map<string, number>();

    for (const lesson of lessons) {
      lessonCountsBySubject.set(
        lesson.subject.name,
        (lessonCountsBySubject.get(lesson.subject.name) ?? 0) + 1,
      );
      if (lesson.lesson_date.getUTCFullYear() !== year) continue;

      const [startHour, startMinute] = lesson.start_time.split(':').map(Number);
      const [endHour, endMinute] = lesson.end_time.split(':').map(Number);
      const durationMinutes =
        endHour * 60 + endMinute - startHour * 60 - startMinute;
      const rateCents =
        rateByTutorAndSubject.get(`${lesson.tutor_id}:${lesson.subject_id}`) ??
        0;
      const monthIndex = lesson.lesson_date.getUTCMonth();
      monthlyRevenue[monthIndex].revenueCents += lessonCostInCents(
        rateCents,
        durationMinutes,
      );
    }

    const totalLessonsBySubject = [...lessonCountsBySubject.values()].reduce(
      (total, count) => total + count,
      0,
    );
    const lessonsBySubject = [...lessonCountsBySubject.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalLessonsBySubject === 0
            ? 0
            : Math.round((count / totalLessonsBySubject) * 100),
      }))
      .sort((left, right) => right.count - left.count);

    const availableHoursByTutor = new Map<number, number>();
    const tutorNames = new Map<number, string>();
    for (const availability of tutorAvailability) {
      const [startHour, startMinute] = availability.start_time.split(':').map(Number);
      const [endHour, endMinute] = availability.end_time.split(':').map(Number);
      const hours = (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
      availableHoursByTutor.set(
        availability.tutor_id,
        (availableHoursByTutor.get(availability.tutor_id) ?? 0) + Math.max(hours, 0),
      );
      tutorNames.set(
        availability.tutor_id,
        `${availability.tutor.first_name} ${availability.tutor.last_name}`,
      );
    }

    return {
      year,
      studentCount,
      activeStudentCount,
      tutorCount,
      activeTutorCount,
      averageRating: reviewStats._avg.rating,
      pendingRequests,
      cancelledLessonCount,
      upcomingLessons,
      pendingRequestItems,
      recentlyCancelledLessons,
      tutorUtilization: [...availableHoursByTutor.entries()]
        .map(([tutorId, weeklyHours]) => {
          const hoursBookedThisWeek = upcomingLessons
            .filter(
              (lesson) =>
                lesson.tutor_id === tutorId && lesson.bookings.length > 0,
            )
            .reduce((hours, lesson) => {
              const [startHour, startMinute] = lesson.start_time
                .split(':')
                .map(Number);
              const [endHour, endMinute] = lesson.end_time
                .split(':')
                .map(Number);
              return (
                hours +
                (endHour * 60 +
                  endMinute -
                  startHour * 60 -
                  startMinute) /
                  60
              );
            }, 0);
          return {
            tutorId,
            tutorName: tutorNames.get(tutorId) ?? `Korepetytor #${tutorId}`,
            weeklyHours,
            bookedHours: Math.round(hoursBookedThisWeek * 100) / 100,
            utilizationPercentage:
              weeklyHours === 0
                ? 0
                : Math.min(
                    Math.round((hoursBookedThisWeek / weeklyHours) * 100),
                    100,
                  ),
          };
        })
        .sort(
          (left, right) =>
            right.utilizationPercentage - left.utilizationPercentage,
        )
        .slice(0, 10),
      monthlyRevenue: monthlyRevenue.map((item) => ({
        month: item.month,
        revenue: fromCents(item.revenueCents),
      })),
      lessonsBySubject,
      completedLessonCount: lessons.length,
    };
  }

  async getAuditLog(query: SearchAuditLogDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'Data początkowa nie może być późniejsza od daty końcowej.',
      );
    }

    const search = query.search?.trim();
    const toExclusive = query.to
      ? new Date(`${query.to}T00:00:00.000Z`)
      : undefined;
    toExclusive?.setUTCDate(toExclusive.getUTCDate() + 1);
    const where: Prisma.AdminAuditLogWhereInput = {
      AND: [{ action: { not: 'DEMO_DATA_EXPANSION' } }],
      ...(query.from && {
        created_at: { gte: new Date(`${query.from}T00:00:00.000Z`) },
      }),
      ...(query.to && {
        created_at: {
          ...(query.from && {
            gte: new Date(`${query.from}T00:00:00.000Z`),
          }),
          lt: toExclusive,
        },
      }),
      ...(query.actorId !== undefined && { actor_id: query.actorId }),
      ...(query.action && { action: query.action }),
      ...(query.entityType && { entity_type: query.entityType }),
      ...(search && {
        OR: [
          { action: { contains: search } },
          { entity_type: { contains: search } },
          { details: { contains: search } },
          {
            actor: {
              OR: [
                { first_name: { contains: search } },
                { last_name: { contains: search } },
              ],
            },
          },
        ],
      }),
    };

    const [data, total, actors] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { created_at: 'desc' },
        include: {
          actor: { select: { id_users: true, first_name: true, last_name: true } },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.user.findMany({
        where: { role: { name: 'admin' } },
        select: {
          id_users: true,
          first_name: true,
          last_name: true,
        },
        orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      }),
    ]);
    return { data, total, limit: query.limit, offset: query.offset, actors };
  }

  async getUserActivity(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id_users: userId, role: { name: { in: ['student', 'tutor'] } } },
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        role: { select: { name: true } },
        created_at: true,
        bookings_as_student: {
          orderBy: { booking_date: 'desc' },
          take: 10,
          include: {
            lesson: {
              select: {
                id_lessons: true,
                lesson_date: true,
                start_time: true,
                end_time: true,
                status: true,
                subject: { select: { name: true } },
                tutor: { select: { first_name: true, last_name: true } },
              },
            },
          },
        },
        lessons_as_tutor: {
          orderBy: { lesson_date: 'desc' },
          take: 10,
          select: {
            id_lessons: true,
            lesson_date: true,
            start_time: true,
            end_time: true,
            status: true,
            subject: { select: { name: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Uczeń lub korepetytor nie został znaleziony.');
    }
    const [bookingCount, tutoringLessonCount, reviewCount, gradeCount, auditEvents] =
      await Promise.all([
        this.prisma.booking.count({ where: { student_id: userId } }),
        this.prisma.lesson.count({ where: { tutor_id: userId } }),
        this.prisma.review.count({
          where: user.role.name === 'student' ? { student_id: userId } : { tutor_id: userId },
        }),
        this.prisma.monthlyGrade.count({
          where: user.role.name === 'student' ? { student_id: userId } : { tutor_id: userId },
        }),
        this.prisma.adminAuditLog.findMany({
          where: {
            OR: [
              { actor_id: userId },
              { entity_type: 'user', entity_id: userId },
            ],
          },
          orderBy: { created_at: 'desc' },
          take: 20,
          include: {
            actor: { select: { first_name: true, last_name: true } },
          },
        }),
      ]);
    return {
      user,
      bookingCount,
      tutoringLessonCount,
      reviewCount,
      gradeCount,
      auditEvents,
    };
  }

  async getFinancialReports() {
    const reports = await this.prisma.financialReport.findMany({
      include: {
        generated_by: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { created_at: 'desc' }],
      take: DEFAULT_LIST_LIMIT,
    });
    return reports.map((report) => {
      const details = this.parseFinancialReportDetails(report.details);
      const lessonIds = details.flatMap((detail) =>
        typeof detail === 'object' &&
        detail !== null &&
        'lesson_id' in detail
          ? [detail.lesson_id]
          : [],
      );
      const {
        total_student_cost_cents,
        total_tutor_salary_cents,
        ...reportData
      } = report;
      return {
        ...reportData,
        total_student_cost: fromCents(total_student_cost_cents),
        total_tutor_salary: fromCents(total_tutor_salary_cents),
        details,
        lesson_count: new Set(lessonIds).size,
      };
    });
  }

  async getFinancialReport(reportId: number) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id_financial_reports: reportId },
      include: {
        generated_by: {
          select: { first_name: true, last_name: true },
        },
      },
    });
    if (!report) {
      throw new NotFoundException('Raport finansowy nie został znaleziony.');
    }

    const details = this.parseFinancialReportDetails(report.details);
    const {
      total_student_cost_cents,
      total_tutor_salary_cents,
      ...reportData
    } = report;

    return {
      ...reportData,
      total_student_cost: fromCents(total_student_cost_cents),
      total_tutor_salary: fromCents(total_tutor_salary_cents),
      details,
      lesson_count: details.length,
    };
  }

  async generateFinancialReport(
    adminId: number,
    { month, year }: GenerateFinancialReportDto,
  ) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const nextMonthStart = new Date(Date.UTC(year, month, 1));
    const lessons = await this.prisma.lesson.findMany({
      where: {
        lesson_date: { gte: monthStart, lt: nextMonthStart },
        status: 'COMPLETED',
        bookings: { some: { status: { not: 'CANCELLED' } } },
      },
      select: {
        id_lessons: true,
        lesson_date: true,
        start_time: true,
        end_time: true,
        tutor_id: true,
        subject_id: true,
        tutor: { select: { first_name: true, last_name: true } },
        subject: { select: { name: true } },
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            student: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: [{ lesson_date: 'asc' }, { start_time: 'asc' }],
    });
    const offers = await this.prisma.tutorSubject.findMany({
      where: {
        tutor_id: {
          in: [...new Set(lessons.map((lesson) => lesson.tutor_id))],
        },
        subject_id: {
          in: [...new Set(lessons.map((lesson) => lesson.subject_id))],
        },
      },
      select: {
        tutor_id: true,
        subject_id: true,
        price_per_hour_cents: true,
      },
    });
    const rates = new Map(
      offers.map((offer) => [
        `${offer.tutor_id}:${offer.subject_id}`,
        offer.price_per_hour_cents,
      ]),
    );

    let totalStudentCostCents = 0;
    let totalTutorSalaryCents = 0;
    const details = lessons.flatMap((lesson) => {
      const [startHour, startMinute] = lesson.start_time.split(':').map(Number);
      const [endHour, endMinute] = lesson.end_time.split(':').map(Number);
      const durationMinutes =
        endHour * 60 + endMinute - startHour * 60 - startMinute;
      const hourlyRateCents = rates.get(
        `${lesson.tutor_id}:${lesson.subject_id}`,
      );
      if (hourlyRateCents === undefined || durationMinutes <= 0) {
        throw new ConflictException(
          `Brak prawidłowej stawki dla lekcji ${lesson.id_lessons}.`,
        );
      }
      const studentCostCents = lessonCostInCents(
        hourlyRateCents,
        durationMinutes,
      );
      const tutorSalaryCents = Math.round(studentCostCents * 0.8);
      totalStudentCostCents += studentCostCents * lesson.bookings.length;
      totalTutorSalaryCents += tutorSalaryCents * lesson.bookings.length;
      const hourlyRate = fromCents(hourlyRateCents);
      const studentCost = fromCents(studentCostCents);
      const tutorSalary = fromCents(tutorSalaryCents);

      return lesson.bookings.map((booking) => ({
        lesson_id: lesson.id_lessons,
        lesson_date: lesson.lesson_date.toISOString().slice(0, 10),
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        subject: lesson.subject.name,
        tutor: `${lesson.tutor.first_name} ${lesson.tutor.last_name}`,
        student: `${booking.student.first_name} ${booking.student.last_name}`,
        duration_hours: durationMinutes / 60,
        hourly_rate: hourlyRate,
        student_cost: studentCost,
        tutor_salary: tutorSalary,
      }));
    });
    const report = await this.prisma.$transaction(async (tx) => {
      const financialReport = await tx.financialReport.create({
        data: {
          month,
          year,
          generated_by_user_id: adminId,
          total_student_cost_cents: totalStudentCostCents,
          total_tutor_salary_cents: totalTutorSalaryCents,
          details: JSON.stringify(details),
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actor_id: adminId,
          action: 'FINANCIAL_REPORT_GENERATED',
          entity_type: 'financial_report',
          entity_id: financialReport.id_financial_reports,
          details: JSON.stringify({ month, year }),
        },
      });
      return financialReport;
    });

    const {
      total_student_cost_cents,
      total_tutor_salary_cents,
      ...reportData
    } = report;
    return {
      ...reportData,
      total_student_cost: fromCents(total_student_cost_cents),
      total_tutor_salary: fromCents(total_tutor_salary_cents),
      lesson_count: lessons.length,
      details,
    };
  }

  async updateUser(adminId: number, userId: number, dto: UpdateUserDto) {
    const user = await this.findManagedUser(userId);

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id_users: true },
      });
      if (existingUser) {
        throw new ConflictException(
          'Użytkownik o podanym adresie email już istnieje.',
        );
      }
    }

    const managedUser = await this.prisma.user.findUnique({
      where: { id_users: userId },
      select: {
        role: { select: { name: true } },
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
      },
    });
    if (!managedUser) {
      throw new NotFoundException('Użytkownik nie został znaleziony.');
    }

    const { role, ...userFields } = dto;
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (role && role !== managedUser.role.name) {
          const [
            lessonCount,
            bookingCount,
            reviewCount,
            gradeCount,
            requestCount,
            offerCount,
            availabilityCount,
          ] = await Promise.all([
            tx.lesson.count({ where: { tutor_id: userId } }),
            tx.booking.count({ where: { student_id: userId } }),
            tx.review.count({
              where: { OR: [{ student_id: userId }, { tutor_id: userId }] },
            }),
            tx.monthlyGrade.count({
              where: { OR: [{ student_id: userId }, { tutor_id: userId }] },
            }),
            tx.subjectRequest.count({ where: { tutor_id: userId } }),
            tx.tutorSubject.count({ where: { tutor_id: userId } }),
            tx.availability.count({ where: { tutor_id: userId } }),
          ]);
          if (
            lessonCount +
              bookingCount +
              reviewCount +
              gradeCount +
              requestCount +
              offerCount +
              availabilityCount >
            0
          ) {
            throw new ConflictException(
              'Nie można zmienić roli konta powiązanego z historią. Zablokuj konto i utwórz nowe z właściwą rolą.',
            );
          }
        }
        const roleRecord = role
          ? await tx.role.findUnique({ where: { name: role } })
          : null;
        if (role && !roleRecord) {
          throw new NotFoundException('Wybrana rola nie istnieje.');
        }
        const updatedUser = await tx.user.update({
          where: { id_users: userId },
          data: {
            ...userFields,
            ...(roleRecord && { role_id: roleRecord.id_roles }),
            ...(roleRecord && roleRecord.name !== managedUser.role.name
              ? { token_version: { increment: 1 } }
              : {}),
          },
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            status: true,
            role: { select: { name: true } },
          },
        });
        await tx.adminAuditLog.create({
          data: {
            actor_id: adminId,
            action: role ? 'USER_UPDATED' : 'USER_DETAILS_UPDATED',
            entity_type: 'user',
            entity_id: userId,
            details: JSON.stringify({
              changedFields: Object.keys(dto),
              previousRole: managedUser.role.name,
              role: updatedUser.role.name,
            }),
          },
        });
        return updatedUser;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Użytkownik o podanym adresie email już istnieje.',
        );
      }
      throw error;
    }
  }

  async updateUserStatus(
    adminId: number,
    userId: number,
    dto: UpdateUserStatusDto,
  ) {
    const user = await this.findManagedUser(userId);
    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id_users: userId },
        data: { status: dto.status },
        select: {
          id_users: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          status: true,
          role: { select: { name: true } },
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actor_id: adminId,
          action: dto.status === 'BLOCKED' ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
          entity_type: 'user',
          entity_id: userId,
          details: JSON.stringify({ email: user.email, status: dto.status }),
        },
      });
      return updatedUser;
    });
  }

  async deleteTutor(adminId: number, userId: number) {
    const tutor = await this.prisma.user.findFirst({
      where: { id_users: userId, role: { name: 'tutor' } },
      select: {
        id_users: true,
        email: true,
        status: true,
      },
    });
    if (!tutor) {
      throw new NotFoundException('Korepetytor nie został znaleziony.');
    }

    const [lessonCount, reviewCount, gradeCount, requestCount, issueCount] =
      await Promise.all([
        this.prisma.lesson.count({ where: { tutor_id: userId } }),
        this.prisma.review.count({ where: { tutor_id: userId } }),
        this.prisma.monthlyGrade.count({ where: { tutor_id: userId } }),
        this.prisma.subjectRequest.count({ where: { tutor_id: userId } }),
        this.prisma.lessonIssue.count({ where: { reporter_id: userId } }),
      ]);
    const hasHistory =
      lessonCount + reviewCount + gradeCount + requestCount + issueCount > 0;
    return this.prisma.$transaction(async (tx) => {
      if (hasHistory) {
        const archivedTutor = await tx.user.update({
          where: { id_users: userId },
          data: {
            status: 'BLOCKED',
            token_version: { increment: 1 },
          },
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            status: true,
            role: { select: { name: true } },
          },
        });
        await tx.adminAuditLog.create({
          data: {
            actor_id: adminId,
            action: 'TUTOR_ARCHIVED',
            entity_type: 'user',
            entity_id: userId,
            details: JSON.stringify({
              email: tutor.email,
              status: 'BLOCKED',
              preservedHistory: true,
            }),
          },
        });
        return { ...archivedTutor, archived: true };
      }

      await tx.adminAuditLog.create({
        data: {
          actor_id: adminId,
          action: 'TUTOR_DELETED',
          entity_type: 'user',
          entity_id: userId,
          details: JSON.stringify({ userId }),
        },
      });
      await tx.user.delete({ where: { id_users: userId } });
      return { id_users: userId, archived: false };
    });
  }

  private async findManagedUser(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id_users: userId,
        role: { name: { in: ['student', 'tutor'] } },
      },
      select: { id_users: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Uczeń lub korepetytor nie został znaleziony.',
      );
    }

    return user;
  }

  private parseFinancialReportDetails(detailsJson: string): unknown[] {
    let details: unknown;
    try {
      details = JSON.parse(detailsJson);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new InternalServerErrorException(
          'Zapisany raport finansowy zawiera nieprawidłowe szczegóły.',
        );
      }
      throw error;
    }

    if (!Array.isArray(details)) {
      throw new InternalServerErrorException(
        'Zapisany raport finansowy zawiera nieprawidłowe szczegóły.',
      );
    }

    return details;
  }
}
