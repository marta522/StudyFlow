import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { SearchTutorsDto } from './dto/search-tutors.dto';
import { UpdateTutorProfileDto } from './dto/update-tutor-profile.dto';

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchTutors(query: SearchTutorsDto) {
    if (
      query.min_price !== undefined &&
      query.max_price !== undefined &&
      query.min_price > query.max_price
    ) {
      throw new BadRequestException(
        'Cena minimalna nie może być wyższa od maksymalnej.',
      );
    }

    const where: Prisma.UserWhereInput = {
      role: { name: 'tutor' },
      status: 'ACTIVE',
      tutor_subjects: {
        some: {
          subject: { status: 'ACTIVE' },
          ...(query.subject_id !== undefined && {
            subject_id: query.subject_id,
          }),
          ...((query.min_price !== undefined ||
            query.max_price !== undefined) && {
            price_per_hour: {
              ...(query.min_price !== undefined && { gte: query.min_price }),
              ...(query.max_price !== undefined && { lte: query.max_price }),
            },
          }),
        },
      },
      ...(query.q && {
        OR: [
          { first_name: { contains: query.q, mode: 'insensitive' } },
          { last_name: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
      ...(query.available_date && {
        lessons_as_tutor: {
          some: {
            lesson_date: new Date(`${query.available_date.slice(0, 10)}T00:00:00.000Z`),
            status: 'SCHEDULED',
            subject: { status: 'ACTIVE' },
            bookings: { none: { status: { not: 'CANCELLED' } } },
          },
        },
      }),
    };

    const tutors = await this.prisma.user.findMany({
      where,
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        about_me: true,
        experience: true,
        tutor_subjects: {
          where: {
            subject: { status: 'ACTIVE' },
            ...(query.subject_id !== undefined && {
              subject_id: query.subject_id,
            }),
            ...((query.min_price !== undefined ||
              query.max_price !== undefined) && {
              price_per_hour: {
                ...(query.min_price !== undefined && {
                  gte: query.min_price,
                }),
                ...(query.max_price !== undefined && {
                  lte: query.max_price,
                }),
              },
            }),
          },
          select: {
            price_per_hour: true,
            experience_years: true,
            description: true,
            subject: { select: { id_subjects: true, name: true } },
          },
        },
        reviews_received: { select: { rating: true } },
      },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });

    return tutors
      .map((tutor) => {
        const ratingCount = tutor.reviews_received.length;
        const rating =
          ratingCount === 0
            ? null
            : Math.round(
                (tutor.reviews_received.reduce(
                  (sum, review) => sum + review.rating,
                  0,
                ) /
                  ratingCount) *
                  100,
              ) / 100;

        return {
          id_users: tutor.id_users,
          first_name: tutor.first_name,
          last_name: tutor.last_name,
          about_me: tutor.about_me,
          experience: tutor.experience,
          subjects: tutor.tutor_subjects.map((offer) => ({
            id_subjects: offer.subject.id_subjects,
            name: offer.subject.name,
            price_per_hour: Number(offer.price_per_hour),
            experience_years: offer.experience_years,
            description: offer.description,
          })),
          rating,
          rating_count: ratingCount,
        };
      })
      .filter(
        (tutor) =>
          query.min_rating === undefined ||
          (tutor.rating !== null && tutor.rating >= query.min_rating),
      )
      .sort(
        (left, right) =>
          (right.rating ?? -1) - (left.rating ?? -1) ||
          left.last_name.localeCompare(right.last_name, 'pl'),
      );
  }

  getProfile(tutorId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id_users: tutorId },
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        about_me: true,
        experience: true,
        created_at: true,
      },
    });
  }

  async getPublicProfile(tutorId: number) {
    const tutor = await this.prisma.user.findFirst({
      where: { id_users: tutorId, role: { name: 'tutor' }, status: 'ACTIVE' },
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        about_me: true,
        experience: true,
        created_at: true,
        tutor_subjects: {
          include: { subject: { select: { id_subjects: true, name: true } } },
        },
        reviews_received: { select: { rating: true } },
      },
    });
    if (!tutor) {
      throw new NotFoundException('Korepetytor nie został znaleziony.');
    }

    const ratingCount = tutor.reviews_received.length;
    const ratingAverage =
      ratingCount === 0
        ? null
        : tutor.reviews_received.reduce(
            (sum, review) => sum + review.rating,
            0,
          ) / ratingCount;

    return {
      id_users: tutor.id_users,
      first_name: tutor.first_name,
      last_name: tutor.last_name,
      about_me: tutor.about_me,
      experience: tutor.experience,
      created_at: tutor.created_at,
      subjects: tutor.tutor_subjects.map((offer) => ({
        id_subjects: offer.subject.id_subjects,
        name: offer.subject.name,
        price_per_hour: Number(offer.price_per_hour),
      })),
      rating:
        ratingAverage === null ? null : Math.round(ratingAverage * 100) / 100,
      rating_count: ratingCount,
    };
  }

  async getMyTutors(studentId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        student_id: studentId,
        status: { not: 'CANCELLED' },
        lesson: {
          status: { not: 'CANCELLED' },
          tutor: { status: 'ACTIVE' },
        },
      },
      select: {
        lesson: {
          select: {
            subject: { select: { id_subjects: true, name: true } },
            tutor: {
              select: {
                id_users: true,
                first_name: true,
                last_name: true,
                tutor_subjects: {
                  select: {
                    subject_id: true,
                    price_per_hour: true,
                  },
                },
                reviews_received: { select: { rating: true } },
              },
            },
          },
        },
      },
    });

    const tutors = new Map<
      number,
      {
        id_users: number;
        first_name: string;
        last_name: string;
        subjects: Map<number, { id_subjects: number; name: string }>;
        prices: Map<number, number>;
        ratings: number[];
      }
    >();

    for (const booking of bookings) {
      const { tutor, subject } = booking.lesson;
      let entry = tutors.get(tutor.id_users);
      if (!entry) {
        entry = {
          id_users: tutor.id_users,
          first_name: tutor.first_name,
          last_name: tutor.last_name,
          subjects: new Map(),
          prices: new Map(
            tutor.tutor_subjects.map((offer) => [
              offer.subject_id,
              Number(offer.price_per_hour),
            ]),
          ),
          ratings: tutor.reviews_received.map((review) => review.rating),
        };
        tutors.set(tutor.id_users, entry);
      }
      entry.subjects.set(subject.id_subjects, subject);
    }

    return [...tutors.values()].map((tutor) => ({
      id_users: tutor.id_users,
      first_name: tutor.first_name,
      last_name: tutor.last_name,
      subjects: [...tutor.subjects.values()].map((subject) => subject.name),
      pricePerHour:
        tutor.subjects.size > 0
          ? Math.min(
              ...[...tutor.subjects.keys()].map(
                (subjectId) => tutor.prices.get(subjectId) ?? 0,
              ),
            )
          : null,
      rating:
        tutor.ratings.length === 0
          ? null
          : Math.round(
              (tutor.ratings.reduce((sum, rating) => sum + rating, 0) /
                tutor.ratings.length) *
                100,
            ) / 100,
      ratingCount: tutor.ratings.length,
    }));
  }

  async getPublicAvailability(tutorId: number) {
    const tutorExists = await this.prisma.user.findFirst({
      where: { id_users: tutorId, role: { name: 'tutor' }, status: 'ACTIVE' },
      select: { id_users: true },
    });
    if (!tutorExists) {
      throw new NotFoundException('Korepetytor nie został znaleziony.');
    }

    return this.prisma.lesson.findMany({
      where: {
        tutor_id: tutorId,
        status: 'SCHEDULED',
        lesson_date: { gte: this.todayUtc() },
        bookings: { none: { status: { not: 'CANCELLED' } } },
      },
      select: {
        id_lessons: true,
        lesson_date: true,
        start_time: true,
        end_time: true,
        subject: { select: { id_subjects: true, name: true } },
      },
      orderBy: [{ lesson_date: 'asc' }, { start_time: 'asc' }],
    });
  }

  updateProfile(tutorId: number, dto: UpdateTutorProfileDto) {
    return this.prisma.user.update({
      where: { id_users: tutorId },
      data: dto,
      select: {
        id_users: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        about_me: true,
        experience: true,
        created_at: true,
      },
    });
  }

  async getStats(tutorId: number) {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        tutor_id: tutorId,
        status: 'COMPLETED',
        bookings: { some: { status: { not: 'CANCELLED' } } },
      },
      select: {
        subject_id: true,
        lesson_date: true,
        start_time: true,
        end_time: true,
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { student_id: true },
        },
      },
    });

    const tutorSubjects = await this.prisma.tutorSubject.findMany({
      where: { tutor_id: tutorId },
      select: { subject_id: true, price_per_hour: true },
    });
    const ratesBySubject = new Map(
      tutorSubjects.map((item) => [
        item.subject_id,
        Number(item.price_per_hour),
      ]),
    );
    const now = new Date();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    let completedHours = 0;
    let currentMonthPayout = 0;

    for (const lesson of lessons) {
      const durationHours = this.getDurationHours(
        lesson.start_time,
        lesson.end_time,
      );
      completedHours += durationHours;

      if (
        lesson.lesson_date.getUTCFullYear() === year &&
        lesson.lesson_date.getUTCMonth() === month
      ) {
        currentMonthPayout +=
          durationHours * (ratesBySubject.get(lesson.subject_id) ?? 0);
      }
    }
    const students = await this.prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' },
        lesson: { tutor_id: tutorId },
      },
      select: { student_id: true },
      distinct: ['student_id'],
    });

    return {
      completedHours: Math.round(completedHours * 100) / 100,
      currentMonthPayout: Math.round(currentMonthPayout * 100) / 100,
      studentCount: students.length,
    };
  }

  getAvailability(tutorId: number) {
    return this.prisma.availability.findMany({
      where: { tutor_id: tutorId, is_active: true },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });
  }

  async createAvailability(tutorId: number, dto: CreateAvailabilityDto) {
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException(
        'Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const conflictingSlot = await tx.availability.findFirst({
            where: {
              tutor_id: tutorId,
              day_of_week: dto.day_of_week,
              is_active: true,
              start_time: { lt: dto.end_time },
              end_time: { gt: dto.start_time },
            },
          });
          if (conflictingSlot) {
            throw new ConflictException(
              'Ten przedział nachodzi na inny termin dostępności.',
            );
          }

          return tx.availability.create({
            data: { tutor_id: tutorId, ...dto },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2034') {
        throw new ConflictException(
          'Termin dostępności koliduje z inną operacją. Odśwież listę i spróbuj ponownie.',
        );
      }
      throw error;
    }
  }

  async deleteAvailability(tutorId: number, availabilityId: number) {
    const slot = await this.prisma.availability.findFirst({
      where: { id_availability: availabilityId, tutor_id: tutorId },
      select: { id_availability: true },
    });
    if (!slot) {
      throw new NotFoundException('Termin dostępności nie został znaleziony.');
    }

    await this.prisma.availability.delete({
      where: { id_availability: availabilityId },
    });
    return { deleted: true };
  }

  private getDurationHours(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    return (endHours * 60 + endMinutes - startHours * 60 - startMinutes) / 60;
  }

  private todayUtc(): Date {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
}
