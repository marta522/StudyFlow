import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { UsersService } from './users.service';

describe('UsersService managed accounts', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    lesson: { count: jest.fn(), findMany: jest.fn() },
    booking: { count: jest.fn() },
    review: { count: jest.fn() },
    monthlyGrade: { count: jest.fn() },
    subjectRequest: { count: jest.fn() },
    lessonIssue: { count: jest.fn() },
    tutorSubject: { count: jest.fn(), findMany: jest.fn() },
    availability: { count: jest.fn() },
    adminAuditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as never);
  });

  it('audits a role change and invalidates the account token version', async () => {
    const updatedUser = {
      id_users: 7,
      first_name: 'Anna',
      last_name: 'Nowak',
      email: 'anna@example.com',
      phone: null,
      status: 'ACTIVE',
      role: { name: 'student' },
    };
    prisma.user.findFirst.mockResolvedValue({
      id_users: 7,
      email: 'anna@example.com',
    });
    prisma.user.findUnique.mockResolvedValue({
      role: { name: 'tutor' },
      first_name: 'Anna',
      last_name: 'Nowak',
      email: 'anna@example.com',
      phone: null,
    });
    const tx = {
      lesson: { count: jest.fn().mockResolvedValue(0) },
      booking: { count: jest.fn().mockResolvedValue(0) },
      review: { count: jest.fn().mockResolvedValue(0) },
      monthlyGrade: { count: jest.fn().mockResolvedValue(0) },
      subjectRequest: { count: jest.fn().mockResolvedValue(0) },
      tutorSubject: { count: jest.fn().mockResolvedValue(0) },
      availability: { count: jest.fn().mockResolvedValue(0) },
      role: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_roles: 1, name: 'student' }),
      },
      user: { update: jest.fn().mockResolvedValue(updatedUser) },
      adminAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.updateUser(2, 7, { role: 'student' }),
    ).resolves.toEqual(updatedUser);

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role_id: 1,
          token_version: { increment: 1 },
        }),
      }),
    );
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actor_id: 2,
          action: 'USER_UPDATED',
          entity_type: 'user',
          entity_id: 7,
        }),
      }),
    );
  });

  it('prevents role changes when the account has lesson history', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id_users: 7,
      email: 'anna@example.com',
    });

    prisma.user.findUnique.mockResolvedValue({
      role: { name: 'tutor' },
    });
    const tx = {
      lesson: { count: jest.fn().mockResolvedValue(1) },
      booking: { count: jest.fn().mockResolvedValue(0) },
      review: { count: jest.fn().mockResolvedValue(0) },
      monthlyGrade: { count: jest.fn().mockResolvedValue(0) },
      subjectRequest: { count: jest.fn().mockResolvedValue(0) },
      tutorSubject: { count: jest.fn().mockResolvedValue(0) },
      availability: { count: jest.fn().mockResolvedValue(0) },
      role: { findUnique: jest.fn() },
      user: { update: jest.fn() },
      adminAuditLog: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.updateUser(2, 7, { role: 'student' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('uses the configured tutor salary percentage when generating a report', async () => {
    const previousPercentage = process.env.TUTOR_SALARY_PERCENT;
    process.env.TUTOR_SALARY_PERCENT = '50';
    prisma.lesson.findMany.mockResolvedValue([
      {
        id_lessons: 31,
        lesson_date: new Date('2026-11-05T00:00:00.000Z'),
        start_time: '14:00',
        end_time: '15:00',
        tutor_id: 7,
        subject_id: 4,
        tutor: { first_name: 'Tomasz', last_name: 'Kowalski' },
        subject: { name: 'Matematyka' },
        bookings: [{ student: { first_name: 'Anna', last_name: 'Nowak' } }],
      },
    ]);
    prisma.tutorSubject.findMany.mockResolvedValue([
      { tutor_id: 7, subject_id: 4, price_per_hour_cents: 10_000 },
    ]);
    const tx = {
      financialReport: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id_financial_reports: 12,
          ...data,
          created_at: new Date(),
        })),
      },
      adminAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    try {
      const report = await service.generateFinancialReport(2, {
        month: 11,
        year: 2026,
      });

      expect(report.total_student_cost).toBe(100);
      expect(report.total_tutor_salary).toBe(50);
      expect(report.details[0]?.tutor_salary).toBe(50);
    } finally {
      if (previousPercentage === undefined) {
        delete process.env.TUTOR_SALARY_PERCENT;
      } else {
        process.env.TUTOR_SALARY_PERCENT = previousPercentage;
      }
    }
  });

  it('archives tutors with history instead of deleting historical records', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id_users: 7,
      email: 'tutor@example.com',
      status: 'ACTIVE',
    });
    prisma.lesson.count.mockResolvedValue(1);
    prisma.review.count.mockResolvedValue(0);
    prisma.monthlyGrade.count.mockResolvedValue(0);
    prisma.subjectRequest.count.mockResolvedValue(0);
    prisma.lessonIssue.count.mockResolvedValue(0);
    const archivedUser = {
      id_users: 7,
      status: 'BLOCKED',
      role: { name: 'tutor' },
    };
    const tx = {
      user: {
        update: jest.fn().mockResolvedValue(archivedUser),
        delete: jest.fn(),
      },
      adminAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(service.deleteTutor(2, 7)).resolves.toEqual({
      ...archivedUser,
      archived: true,
    });

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'BLOCKED',
          token_version: { increment: 1 },
        },
      }),
    );
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'TUTOR_ARCHIVED' }),
      }),
    );
  });

  it('filters audit events by actor, event type, and inclusive date range', async () => {
    prisma.adminAuditLog.findMany.mockResolvedValue([]);
    prisma.adminAuditLog.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    await service.getAuditLog({
      actorId: 5,
      action: 'LESSON_CANCELLED',
      from: '2026-10-01',
      to: '2026-10-31',
      limit: 20,
      offset: 0,
    });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ action: { not: 'DEMO_DATA_EXPANSION' } }],
          actor_id: 5,
          action: 'LESSON_CANCELLED',
          created_at: {
            gte: new Date('2026-10-01T00:00:00.000Z'),
            lt: new Date('2026-11-01T00:00:00.000Z'),
          },
        }),
        take: 20,
        skip: 0,
      }),
    );
  });
});
