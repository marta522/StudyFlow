import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const prisma = {
    booking: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    review: { create: jest.fn() },
    lesson: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  let service: ReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewsService(prisma as never);
  });

  it('creates a review linked to the most recent eligible completed lesson', async () => {
    prisma.booking.findFirst.mockResolvedValue({ lesson_id: 31 });
    const review = { id_reviews: 5, rating: 5, comment: 'Bardzo polecam.' };
    prisma.review.create.mockResolvedValue(review);

    await expect(
      service.createReview(9, {
        tutor_id: 7,
        rating: 5,
        comment: '  Bardzo polecam.  ',
      }),
    ).resolves.toEqual(review);

    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student_id: 9,
          status: { not: 'CANCELLED' },
          lesson: expect.objectContaining({
            tutor_id: 7,
            status: 'COMPLETED',
            reviews: { none: { student_id: 9 } },
          }),
        }),
        orderBy: [{ lesson: { lesson_date: 'desc' } }],
      }),
    );
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          student_id: 9,
          tutor_id: 7,
          lesson_id: 31,
          rating: 5,
          comment: 'Bardzo polecam.',
        },
      }),
    );
  });

  it('auto-completes an ended lesson before checking review eligibility', async () => {
    prisma.booking.findFirst.mockResolvedValue({ lesson_id: 31 });
    prisma.review.create.mockResolvedValue({
      id_reviews: 5,
      rating: 5,
      comment: null,
    });

    await service.createReview(9, { tutor_id: 7, rating: 5 });

    expect(prisma.lesson.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SCHEDULED' }),
        data: { status: 'COMPLETED' },
      }),
    );
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lesson: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      }),
    );
  });

  it('does not allow a review without an eligible completed lesson', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id_users: 7 });

    await expect(
      service.createReview(9, { tutor_id: 7, rating: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.review.create).not.toHaveBeenCalled();
  });
});
