import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';

describe('BookingsService schedule changes', () => {
  const prisma = {
    lesson: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(prisma as never);
  });

  it('notifies the old and new tutor and active students when an admin changes a lesson', async () => {
    const lessonDate = new Date();
    lessonDate.setUTCDate(lessonDate.getUTCDate() + 7);
    lessonDate.setUTCHours(0, 0, 0, 0);
    const dayNames = [
      'Niedziela',
      'Poniedziałek',
      'Wtorek',
      'Środa',
      'Czwartek',
      'Piątek',
      'Sobota',
    ];
    const lesson = {
      id_lessons: 3,
      tutor_id: 7,
      subject_id: 4,
      lesson_date: lessonDate,
      start_time: '14:00',
      end_time: '15:00',
      status: 'SCHEDULED',
      subject: { name: 'Matematyka' },
      bookings: [{ student_id: 9 }],
    };
    const tx = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue(lesson),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({
          ...lesson,
          tutor_id: 8,
          start_time: '16:00',
        }),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id_users: 8 }) },
      tutorSubject: {
        findFirst: jest.fn().mockResolvedValue({ id_tutor_subjects: 2 }),
      },
      availability: {
        findFirst: jest.fn().mockResolvedValue({ id_availability: 1 }),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
      adminAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await service.updateAdminLesson(2, 3, {
      tutor_id: 8,
      start_time: '16:00',
      end_time: '17:00',
    });

    expect(tx.lesson.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          bookings: expect.objectContaining({
            where: { status: { not: 'CANCELLED' } },
          }),
        }),
      }),
    );
    expect(tx.notification.create).toHaveBeenCalledTimes(3);
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actor_id: 2,
          action: 'LESSON_UPDATED',
          entity_id: 3,
        }),
      }),
    );
    expect(
      tx.notification.create.mock.calls
        .map(([call]) => call.data.user_id)
        .sort(),
    ).toEqual([7, 8, 9]);
    expect(tx.availability.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          day_of_week: dayNames[lessonDate.getUTCDay()],
        }),
      }),
    );
  });

  it('filters the admin schedule by the selected lesson status', async () => {
    prisma.lesson.findMany.mockResolvedValue([]);

    await service.getAdminSchedule({ status: 'CANCELLED' });

    expect(prisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });

  it('creates a booking for an available scheduled lesson and notifies the tutor', async () => {
    const lessonDate = new Date();
    lessonDate.setUTCDate(lessonDate.getUTCDate() + 7);
    lessonDate.setUTCHours(0, 0, 0, 0);
    const lesson = {
      id_lessons: 13,
      tutor_id: 7,
      lesson_date: lessonDate,
      start_time: '14:00',
      end_time: '15:00',
      status: 'SCHEDULED',
      bookings: [],
    };
    const booking = {
      id_bookings: 21,
      lesson: {
        lesson_date: lessonDate,
        start_time: '14:00',
        end_time: '15:00',
        subject: { name: 'Matematyka' },
      },
    };
    const tx = {
      lesson: { findUnique: jest.fn().mockResolvedValue(lesson) },
      booking: { create: jest.fn().mockResolvedValue(booking) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.bookLesson(9, { lesson_id: 13, note: 'Przygotowanie do matury' }),
    ).resolves.toEqual(booking);

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          lesson_id: 13,
          student_id: 9,
          note: 'Przygotowanie do matury',
        },
      }),
    );
    expect(tx.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: 7,
          type: 'LESSON_BOOKED',
        }),
      }),
    );
  });

  it('rejects booking a lesson that already has an active booking', async () => {
    const lessonDate = new Date();
    lessonDate.setUTCDate(lessonDate.getUTCDate() + 7);
    lessonDate.setUTCHours(0, 0, 0, 0);
    const tx = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue({
          id_lessons: 13,
          tutor_id: 7,
          lesson_date: lessonDate,
          status: 'SCHEDULED',
          bookings: [{ status: 'CONFIRMED' }],
        }),
      },
      booking: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.bookLesson(9, { lesson_id: 13 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('maps a database-level active booking uniqueness violation to HTTP 409', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.bookLesson(9, { lesson_id: 13 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects booking a lesson whose start time has already passed today', async () => {
    const now = new Date();
    const lessonDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const tx = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue({
          id_lessons: 13,
          tutor_id: 7,
          lesson_date: lessonDate,
          start_time: '00:00',
          status: 'SCHEDULED',
          bookings: [],
        }),
      },
      booking: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.bookLesson(9, { lesson_id: 13 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('uses APP_TIMEZONE instead of the host timezone', async () => {
    const previousTimezone = process.env.TZ;
    const previousAppTimezone = process.env.APP_TIMEZONE;
    process.env.TZ = 'UTC';
    process.env.APP_TIMEZONE = 'Europe/Warsaw';
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T00:30:00.000Z'));

    try {
      const timezoneService = new BookingsService(prisma as never);
      const tx = {
        lesson: {
          findUnique: jest.fn().mockResolvedValue({
            id_lessons: 13,
            tutor_id: 7,
            lesson_date: new Date('2026-01-15T00:00:00.000Z'),
            start_time: '01:00',
            status: 'SCHEDULED',
            bookings: [],
          }),
        },
        booking: { create: jest.fn() },
        notification: { create: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(tx as never),
      );

      await expect(
        timezoneService.bookLesson(9, { lesson_id: 13 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.booking.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
      if (previousAppTimezone === undefined) delete process.env.APP_TIMEZONE;
      else process.env.APP_TIMEZONE = previousAppTimezone;
    }
  });

  it('maps admin lesson transaction conflicts to HTTP 409', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Transaction conflict', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const lessonDate = tomorrow.toISOString().slice(0, 10);

    await expect(
      service.createAdminLesson(1, {
        tutor_id: 2,
        subject_id: 3,
        lesson_date: lessonDate,
        start_time: '10:00',
        end_time: '11:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.updateAdminLesson(1, 2, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
