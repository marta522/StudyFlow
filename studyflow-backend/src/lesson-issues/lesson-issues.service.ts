import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonIssueDto } from './dto/create-lesson-issue.dto';
import { UpdateLessonIssueDto } from './dto/update-lesson-issue.dto';

@Injectable()
export class LessonIssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: number, role: string, dto: CreateLessonIssueDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id_lessons: dto.lesson_id },
      select: {
        id_lessons: true,
        tutor_id: true,
        subject: { select: { name: true } },
        bookings: {
          where: { student_id: reporterId, status: { not: 'CANCELLED' } },
          select: { id_bookings: true },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lekcja nie została znaleziona.');
    const title = dto.title.trim();
    const description = dto.description.trim();
    if (title.length < 3 || description.length < 10) {
      throw new BadRequestException(
        'Temat musi mieć co najmniej 3 znaki, a opis co najmniej 10 znaków.',
      );
    }
    const isParticipant =
      (role === 'tutor' && lesson.tutor_id === reporterId) ||
      (role === 'student' && lesson.bookings.length > 0);
    if (!isParticipant) {
      throw new ForbiddenException(
        'Zgłoszenie może dodać tylko uczeń lub korepetytor uczestniczący w lekcji.',
      );
    }

    const duplicate = await this.prisma.lessonIssue.findFirst({
      where: {
        lesson_id: lesson.id_lessons,
        reporter_id: reporterId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      select: { id_lesson_issues: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'Masz już nierozpatrzone zgłoszenie dotyczące tej lekcji.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const issue = await tx.lessonIssue.create({
        data: {
          lesson_id: lesson.id_lessons,
          reporter_id: reporterId,
          title,
          description,
        },
      });
      const admins = await tx.user.findMany({
        where: { role: { name: 'admin' }, status: 'ACTIVE' },
        select: { id_users: true },
      });
      await Promise.all(
        admins.map((admin) =>
          tx.notification.create({
            data: {
              user_id: admin.id_users,
              title: 'Nowe zgłoszenie problemu z lekcją',
              message: `Zgłoszono problem dotyczący lekcji ${lesson.subject.name}: ${issue.title}.`,
              type: 'ADMIN_LESSON_ISSUE',
            },
          }),
        ),
      );
      return issue;
    });
  }

  getForReporter(reporterId: number) {
    return this.prisma.lessonIssue.findMany({
      where: { reporter_id: reporterId },
      include: {
        lesson: {
          select: {
            lesson_date: true,
            subject: { select: { name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  getForAdmin(status?: string) {
    if (status && !['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      throw new BadRequestException('Nieprawidłowy status zgłoszenia.');
    }
    return this.prisma.lessonIssue.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: {
          select: {
            id_users: true,
            first_name: true,
            last_name: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        resolver: { select: { first_name: true, last_name: true } },
        lesson: {
          include: {
            subject: { select: { name: true } },
            tutor: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
      take: 200,
    });
  }

  async updateForAdmin(
    adminId: number,
    issueId: number,
    dto: UpdateLessonIssueDto,
  ) {
    const issue = await this.prisma.lessonIssue.findUnique({
      where: { id_lesson_issues: issueId },
      select: { id_lesson_issues: true, status: true },
    });
    if (!issue) throw new NotFoundException('Zgłoszenie nie zostało znalezione.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lessonIssue.update({
        where: { id_lesson_issues: issueId },
        data: {
          status: dto.status,
          admin_note: dto.admin_note?.trim() || null,
          resolved_by: dto.status === 'RESOLVED' ? adminId : null,
        },
        include: {
          reporter: { select: { id_users: true } },
        },
      });
      await tx.notification.create({
        data: {
          user_id: updated.reporter.id_users,
          title: 'Zaktualizowano zgłoszenie lekcji',
          message: [
            dto.status === 'RESOLVED'
              ? `Zgłoszenie „${updated.title}” zostało rozwiązane.`
              : `Status zgłoszenia „${updated.title}” zmieniono na ${
                  dto.status === 'OPEN' ? 'otwarte' : 'w trakcie'
                }.`,
            dto.admin_note?.trim() ? `Notatka administratora: ${dto.admin_note.trim()}` : '',
          ]
            .filter(Boolean)
            .join(' '),
          type: 'LESSON_ISSUE_UPDATE',
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actor_id: adminId,
          action: 'LESSON_ISSUE_UPDATED',
          entity_type: 'lesson_issue',
          entity_id: issueId,
          details: JSON.stringify({
            previousStatus: issue.status,
            status: dto.status,
            hasAdminNote: Boolean(dto.admin_note?.trim()),
          }),
        },
      });
      return updated;
    });
  }
}
