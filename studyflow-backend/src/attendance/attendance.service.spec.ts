import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  const prisma = {
    booking: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceService(prisma as never);
  });

  it('does not allow marking attendance before the lesson ends', async () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    prisma.booking.findUnique.mockResolvedValue({
      status: 'CONFIRMED',
      lesson: {
        tutor_id: 7,
        lesson_date: tomorrow,
        end_time: '23:59',
      },
      attendance: null,
    });

    await expect(
      service.markAttendance(7, { booking_id: 12, present: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not allow marking attendance twice', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      status: 'CONFIRMED',
      lesson: { tutor_id: 7 },
      attendance: { id_attendance: 18 },
    });

    await expect(
      service.markAttendance(7, { booking_id: 12, present: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps a concurrent duplicate attendance insert to a conflict', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      status: 'CONFIRMED',
      lesson: {
        id_lessons: 2,
        tutor_id: 7,
        lesson_date: new Date('2020-01-01T00:00:00.000Z'),
        end_time: '10:00',
      },
      attendance: null,
    });
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
    const tx = {
      attendance: { create: jest.fn().mockRejectedValue(duplicateError) },
      lesson: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.markAttendance(7, { booking_id: 12, present: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
