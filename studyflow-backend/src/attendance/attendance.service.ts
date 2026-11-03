import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { getLessonEnd } from '../common/timezone';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async markAttendance(tutorId: number, dto: MarkAttendanceDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id_bookings: dto.booking_id },
      include: { lesson: true, attendance: true },
    });

    if (!booking || booking.status === 'CANCELLED') {
      throw new NotFoundException('Aktywna rezerwacja nie została znaleziona.');
    }

    if (booking.lesson.tutor_id !== tutorId) {
      throw new ForbiddenException(
        'Możesz oznaczyć obecność tylko na własnej lekcji.',
      );
    }

    if (booking.attendance) {
      throw new ConflictException(
        'Obecność na tej lekcji została już oznaczona.',
      );
    }

    const lessonEnd = getLessonEnd(
      booking.lesson.lesson_date,
      booking.lesson.end_time,
    );
    if (lessonEnd > new Date()) {
      throw new ForbiddenException(
        'Obecność można oznaczyć po zakończeniu lekcji.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attendance = await tx.attendance.create({
          data: {
            booking_id: dto.booking_id,
            present: dto.present,
            marked_by: tutorId,
          },
        });
        await tx.lesson.update({
          where: { id_lessons: booking.lesson.id_lessons },
          data: { status: 'COMPLETED' },
        });
        return attendance;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Obecność na tej lekcji została już oznaczona.',
        );
      }
      throw error;
    }
  }

  async getAttendanceForBooking(
    bookingId: number,
    requesterId: number,
    role: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id_bookings: bookingId },
      include: { lesson: { select: { tutor_id: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Rezerwacja nie została znaleziona.');
    }

    if (
      role !== 'admin' &&
      booking.student_id !== requesterId &&
      booking.lesson.tutor_id !== requesterId
    ) {
      throw new ForbiddenException(
        'Nie masz dostępu do obecności tej rezerwacji.',
      );
    }

    return this.prisma.attendance.findUnique({
      where: { booking_id: bookingId },
    });
  }
}
