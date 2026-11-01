import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GradesService } from './grades.service';

describe('GradesService', () => {
  const prisma = {
    lesson: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: GradesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GradesService(prisma as never);
  });

  it('does not allow grading before the lesson ends', async () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    prisma.lesson.findFirst.mockResolvedValue({
      id_lessons: 2,
      lesson_date: tomorrow,
      end_time: '23:59',
      subject_id: 4,
      bookings: [{ student_id: 8 }],
    });

    await expect(
      service.createGrade(7, { lesson_id: 2, grade: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps a duplicate monthly grade for a subject to a conflict', async () => {
    prisma.lesson.findFirst.mockResolvedValue({
      id_lessons: 2,
      lesson_date: new Date('2020-01-01T00:00:00.000Z'),
      end_time: '10:00',
      subject_id: 4,
      bookings: [{ student_id: 8 }],
    });
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
    const tx = {
      monthlyGrade: { create: jest.fn().mockRejectedValue(duplicateError) },
    };
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      service.createGrade(7, { lesson_id: 2, grade: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
