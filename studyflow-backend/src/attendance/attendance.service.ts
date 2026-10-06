import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async markAttendance(tutorId: number, dto: MarkAttendanceDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id_bookings: dto.booking_id },
      include: { lesson: true },
    });

    if (!booking || booking.status === 'CANCELLED') {
      throw new NotFoundException('Aktywna rezerwacja nie została znaleziona.');
    }

    if (booking.lesson.tutor_id !== tutorId) {
      throw new ForbiddenException(
        'Możesz oznaczyć obecność tylko na własnej lekcji.',
      );
    }

    const lessonEnd = this.getLessonEnd(
      booking.lesson.lesson_date,
      booking.lesson.end_time,
    );
    if (lessonEnd > new Date()) {
      throw new ForbiddenException(
        'Obecność można oznaczyć po zakończeniu lekcji.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.upsert({
        where: { booking_id: dto.booking_id },
        update: {
          present: dto.present,
          marked_by: tutorId,
          marked_at: new Date(),
        },
        create: {
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

  private getLessonEnd(lessonDate: Date, endTime: string): Date {
    const [hours, minutes] = endTime.split(':').map(Number);
    const end = new Date(lessonDate);
    end.setUTCHours(hours, minutes, 0, 0);
    return end;
  }
}
