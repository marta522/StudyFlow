import { jest } from '@jest/globals';
import { completePastLessons } from './lesson-completion';

describe('completePastLessons', () => {
  it('completes older lessons and ended lessons from today only', async () => {
    const now = new Date('2026-01-15T16:30:00.000Z');
    const prisma = {
      lesson: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 2 })
          .mockResolvedValueOnce({
            count: 1,
          }),
        findMany: jest.fn().mockResolvedValue([
          {
            id_lessons: 3,
            lesson_date: new Date('2026-01-15T00:00:00.000Z'),
            end_time: '16:00',
          },
          {
            id_lessons: 4,
            lesson_date: new Date('2026-01-15T00:00:00.000Z'),
            end_time: '18:00',
          },
        ]),
      },
    };

    await expect(completePastLessons(prisma as never, now)).resolves.toBe(3);

    expect(prisma.lesson.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        status: 'SCHEDULED',
        lesson_date: { lt: new Date('2026-01-15T00:00:00.000Z') },
      },
      data: { status: 'COMPLETED' },
    });
    expect(prisma.lesson.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id_lessons: { in: [3] }, status: 'SCHEDULED' },
      data: { status: 'COMPLETED' },
    });
  });
});
