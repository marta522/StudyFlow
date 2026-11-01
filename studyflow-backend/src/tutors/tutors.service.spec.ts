import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { TutorsService } from './tutors.service';

describe('TutorsService search', () => {
  const prisma = {
    user: { findMany: jest.fn() },
  };
  let service: TutorsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([]);
    service = new TutorsService(prisma as never);
  });

  it('filters free lesson slots by date and requested time range', async () => {
    await service.searchTutors({
      available_date: '2026-12-10',
      available_from: '14:00',
      available_to: '17:00',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lessons_as_tutor: {
            some: expect.objectContaining({
              lesson_date: new Date('2026-12-10T00:00:00.000Z'),
              start_time: { gte: '14:00' },
              end_time: { lte: '17:00' },
            }),
          },
        }),
      }),
    );
  });

  it('requires both times and a date when filtering by time availability', async () => {
    await expect(
      service.searchTutors({ available_from: '14:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reversed time ranges', async () => {
    await expect(
      service.searchTutors({
        available_date: '2026-12-10',
        available_from: '17:00',
        available_to: '14:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
