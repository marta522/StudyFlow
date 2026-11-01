import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonIssueDto } from './dto/create-lesson-issue.dto';
import { LessonIssuesService } from './lesson-issues.service';

describe('LessonIssuesService', () => {
  let service: LessonIssuesService;
  const transaction = {
    lessonIssue: { create: jest.fn(), update: jest.fn() },
    user: { findMany: jest.fn() },
    notification: { create: jest.fn() },
    adminAuditLog: { create: jest.fn() },
  };
  const prisma = {
    lesson: { findUnique: jest.fn() },
    lessonIssue: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonIssuesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<LessonIssuesService>(LessonIssuesService);
  });

  const dto: CreateLessonIssueDto = {
    lesson_id: 12,
    title: 'Problem z lekcją',
    description: 'Nie udało się połączyć z pokojem lekcyjnym.',
  };

  it('creates a participant report and notifies active administrators', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id_lessons: 12,
      tutor_id: 4,
      subject: { name: 'Matematyka' },
      bookings: [{ id_bookings: 22 }],
    });
    prisma.lessonIssue.findFirst.mockResolvedValue(null);
    transaction.lessonIssue.create.mockResolvedValue({
      id_lesson_issues: 5,
      title: dto.title,
    });
    transaction.user.findMany.mockResolvedValue([{ id_users: 1 }]);

    await service.create(7, 'student', dto);

    expect(transaction.lessonIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lesson_id: 12,
          reporter_id: 7,
          title: dto.title,
          description: dto.description,
        }),
      }),
    );
    expect(transaction.notification.create).toHaveBeenCalledTimes(1);
  });

  it('rejects reports from users who are not lesson participants', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id_lessons: 12,
      tutor_id: 4,
      subject: { name: 'Matematyka' },
      bookings: [],
    });

    await expect(service.create(7, 'student', dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.lessonIssue.findFirst).not.toHaveBeenCalled();
  });

  it('prevents a reporter from submitting a second unresolved report', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id_lessons: 12,
      tutor_id: 4,
      subject: { name: 'Matematyka' },
      bookings: [{ id_bookings: 22 }],
    });
    prisma.lessonIssue.findFirst.mockResolvedValue({ id_lesson_issues: 3 });

    await expect(service.create(7, 'student', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(transaction.lessonIssue.create).not.toHaveBeenCalled();
  });
});
