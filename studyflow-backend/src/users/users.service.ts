import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { GenerateFinancialReportDto } from './dto/generate-financial-report.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    });
  }

  async createManagedUser(dto: CreateManagedUserDto) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
      select: { id_roles: true },
    });
    if (!role) {
      throw new NotFoundException('Wybrana rola nie istnieje.');
    }

    try {
      return await this.prisma.user.create({
        data: {
          first_name: dto.first_name.trim(),
          last_name: dto.last_name.trim(),
          email: dto.email.trim().toLowerCase(),
          password_hash: await bcrypt.hash(dto.password, 10),
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
      tutorCount,
      reviewStats,
      pendingRequests,
      lessons,
      rates,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { name: 'student' } } }),
      this.prisma.user.count({ where: { role: { name: 'tutor' } } }),
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
          price_per_hour: true,
        },
      }),
    ]);

    const rateByTutorAndSubject = new Map(
      rates.map((rate) => [
        `${rate.tutor_id}:${rate.subject_id}`,
        Number(rate.price_per_hour),
      ]),
    );
    const year = new Date().getUTCFullYear();
    const monthlyRevenue = Array.from({ length: 12 }, (_, month) => ({
      month: month + 1,
      revenue: 0,
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
      const durationHours =
        (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
      const rate =
        rateByTutorAndSubject.get(`${lesson.tutor_id}:${lesson.subject_id}`) ??
        0;
      const monthIndex = lesson.lesson_date.getUTCMonth();
      monthlyRevenue[monthIndex].revenue += durationHours * rate;
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

    return {
      year,
      studentCount,
      tutorCount,
      averageRating: reviewStats._avg.rating,
      pendingRequests,
      monthlyRevenue: monthlyRevenue.map((item) => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
      })),
      lessonsBySubject,
      completedLessonCount: lessons.length,
    };
  }

  getFinancialReports() {
    return this.prisma.financialReport.findMany({
      include: {
        generated_by: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { created_at: 'desc' }],
    });
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
      select: { tutor_id: true, subject_id: true, price_per_hour: true },
    });
    const rates = new Map(
      offers.map((offer) => [
        `${offer.tutor_id}:${offer.subject_id}`,
        Number(offer.price_per_hour),
      ]),
    );

    let totalStudentCost = 0;
    let totalTutorSalary = 0;
    const details = lessons.flatMap((lesson) => {
      const [startHour, startMinute] = lesson.start_time.split(':').map(Number);
      const [endHour, endMinute] = lesson.end_time.split(':').map(Number);
      const durationHours =
        (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
      const hourlyRate = rates.get(`${lesson.tutor_id}:${lesson.subject_id}`);
      if (hourlyRate === undefined || durationHours <= 0) {
        throw new ConflictException(
          `Brak prawidłowej stawki dla lekcji ${lesson.id_lessons}.`,
        );
      }
      const studentCost = durationHours * hourlyRate;
      const tutorSalary = studentCost * 0.8;
      totalStudentCost += studentCost * lesson.bookings.length;
      totalTutorSalary += tutorSalary * lesson.bookings.length;

      return lesson.bookings.map((booking) => ({
        lesson_id: lesson.id_lessons,
        lesson_date: lesson.lesson_date,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        subject: lesson.subject.name,
        tutor: `${lesson.tutor.first_name} ${lesson.tutor.last_name}`,
        student: `${booking.student.first_name} ${booking.student.last_name}`,
        duration_hours: durationHours,
        hourly_rate: hourlyRate,
        student_cost: studentCost,
        tutor_salary: tutorSalary,
      }));
    });
    const roundCurrency = (value: number) => Math.round(value * 100) / 100;
    const report = await this.prisma.financialReport.create({
      data: {
        month,
        year,
        generated_by_user_id: adminId,
        total_student_cost: roundCurrency(totalStudentCost),
        total_tutor_salary: roundCurrency(totalTutorSalary),
      },
    });

    return {
      ...report,
      total_student_cost: roundCurrency(totalStudentCost),
      total_tutor_salary: roundCurrency(totalTutorSalary),
      lesson_count: lessons.length,
      details,
    };
  }

  async updateUser(userId: number, dto: UpdateUserDto) {
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

    try {
      return await this.prisma.user.update({
        where: { id_users: userId },
        data: dto,
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

  async updateUserStatus(userId: number, dto: UpdateUserStatusDto) {
    await this.findManagedUser(userId);
    return this.prisma.user.update({
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
  }

  async deleteTutor(userId: number) {
    const tutor = await this.prisma.user.findFirst({
      where: { id_users: userId, role: { name: 'tutor' } },
      select: { id_users: true },
    });
    if (!tutor) {
      throw new NotFoundException('Korepetytor nie został znaleziony.');
    }

    const [lessonCount, reviewCount, gradeCount, requestCount] =
      await Promise.all([
        this.prisma.lesson.count({ where: { tutor_id: userId } }),
        this.prisma.review.count({ where: { tutor_id: userId } }),
        this.prisma.monthlyGrade.count({ where: { tutor_id: userId } }),
        this.prisma.subjectRequest.count({ where: { tutor_id: userId } }),
      ]);
    if (lessonCount + reviewCount + gradeCount + requestCount > 0) {
      throw new ConflictException(
        'Nie można usunąć korepetytora powiązanego z historią zajęć. Zablokuj konto, aby zachować dane historyczne.',
      );
    }

    await this.prisma.user.delete({ where: { id_users: userId } });
    return { id_users: userId };
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
}
