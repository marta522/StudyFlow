import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTutorReviews(tutorId: number) {
    const tutor = await this.prisma.user.findFirst({
      where: { id_users: tutorId, role: { name: 'tutor' } },
      select: { id_users: true },
    });
    if (!tutor) {
      throw new NotFoundException('Korepetytor nie został znaleziony.');
    }

    return this.prisma.review.findMany({
      where: { tutor_id: tutorId },
      select: {
        id_reviews: true,
        rating: true,
        comment: true,
        created_at: true,
        student: { select: { first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createReview(studentId: number, dto: CreateReviewDto) {
    const eligibleBooking = await this.prisma.booking.findFirst({
      where: {
        student_id: studentId,
        status: { not: 'CANCELLED' },
        lesson: {
          tutor_id: dto.tutor_id,
          status: 'COMPLETED',
          reviews: { none: { student_id: studentId } },
        },
      },
      select: { lesson_id: true },
      orderBy: [{ lesson: { lesson_date: 'desc' } }],
    });

    if (!eligibleBooking) {
      const tutor = await this.prisma.user.findFirst({
        where: { id_users: dto.tutor_id, role: { name: 'tutor' } },
        select: { id_users: true },
      });
      if (!tutor) {
        throw new NotFoundException('Korepetytor nie został znaleziony.');
      }
      throw new ConflictException(
        'Opinię można dodać po ukończonej lekcji. Dla jednej lekcji można wystawić tylko jedną opinię.',
      );
    }

    try {
      return await this.prisma.review.create({
        data: {
          student_id: studentId,
          tutor_id: dto.tutor_id,
          lesson_id: eligibleBooking.lesson_id,
          rating: dto.rating,
          comment: dto.comment?.trim(),
        },
        select: {
          id_reviews: true,
          rating: true,
          comment: true,
          created_at: true,
          student: { select: { first_name: true, last_name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Opinia dla tej lekcji została już wystawiona.',
        );
      }
      throw error;
    }
  }
}
