import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus } from './subject-status.enum';
import { AssignTutorSubjectDto } from './dto/assign-tutor-subject.dto';
import { CreateSubjectRequestDto } from './dto/create-subject-request.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      include: {
        tutor_subjects: {
          include: {
            tutor: {
              select: {
                id_users: true,
                first_name: true,
                last_name: true,
                email: true,
                experience: true,
              },
            },
          },
        },
      },
    });
  }

  findAllForAdmin() {
    return this.prisma.subject.findMany({
      include: {
        tutor_subjects: {
          select: { tutor_id: true },
        },
        _count: {
          select: {
            tutor_subjects: true,
            lessons: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(dto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Przedmiot o tej nazwie już istnieje.');
    }

    try {
      return await this.prisma.subject.create({
        data: {
          name: dto.name.trim(),
          description: dto.description,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Przedmiot o tej nazwie już istnieje.');
      }
      throw error;
    }
  }

  async updateSubject(subjectId: number, dto: UpdateSubjectDto) {
    const normalizedName = dto.name?.trim();
    const subject = await this.prisma.subject.findUnique({
      where: { id_subjects: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Przedmiot nie został znaleziony.');
    }

    if (normalizedName && normalizedName !== subject.name) {
      const existing = await this.prisma.subject.findFirst({
        where: { name: normalizedName },
      });

      if (existing) {
        throw new BadRequestException('Przedmiot o tej nazwie już istnieje.');
      }
    }

    try {
      return await this.prisma.subject.update({
        where: { id_subjects: subjectId },
        data: { ...dto, name: normalizedName },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Przedmiot o podanej nazwie już istnieje.');
      }
      throw error;
    }
  }

  async deactivateSubject(subjectId: number) {
    const subject = await this.prisma.subject.findUnique({
      where: { id_subjects: subjectId },
      select: { id_subjects: true, status: true },
    });
    if (!subject) {
      throw new NotFoundException('Przedmiot nie został znaleziony.');
    }
    if (subject.status === 'INACTIVE') {
      return subject;
    }

    return this.prisma.subject.update({
      where: { id_subjects: subjectId },
      data: { status: 'INACTIVE' },
      select: { id_subjects: true, status: true },
    });
  }

  async assignToTutor(tutorId: number, dto: AssignTutorSubjectDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id_subjects: dto.subject_id },
    });

    if (!subject || subject.status !== 'ACTIVE') {
      throw new NotFoundException('Aktywny przedmiot nie został znaleziony.');
    }

    const existingAssignment = await this.prisma.tutorSubject.findFirst({
      where: {
        tutor_id: tutorId,
        subject_id: dto.subject_id,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        'Już przypisałeś ten przedmiot do swojej oferty.',
      );
    }

    return this.prisma.tutorSubject.create({
      data: {
        tutor_id: tutorId,
        subject_id: dto.subject_id,
        price_per_hour: dto.price_per_hour,
        experience_years: dto.experience_years,
        description: dto.description,
      },
    });
  }

  async getTutorSubjects(tutorId: number) {
    return this.prisma.tutorSubject.findMany({
      where: { tutor_id: tutorId },
      include: { subject: true },
    });
  }

  async createSubjectRequest(tutorId: number, dto: CreateSubjectRequestDto) {
    const existingSubject = await this.prisma.subject.findFirst({
      where: { name: dto.subject_name, status: 'ACTIVE' },
    });

    if (existingSubject) {
      throw new BadRequestException(
        'Ten przedmiot już istnieje i jest dostępny.',
      );
    }

    const pendingRequest = await this.prisma.subjectRequest.findFirst({
      where: {
        tutor_id: tutorId,
        subject_name: dto.subject_name,
        status: 'PENDING',
      },
    });

    if (pendingRequest) {
      throw new BadRequestException(
        'Prośba o dodanie tego przedmiotu już oczekuje na rozpatrzenie.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.subjectRequest.create({
        data: {
          tutor_id: tutorId,
          subject_name: dto.subject_name,
          description: dto.description,
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
              title: 'Nowe zgłoszenie przedmiotu',
              message: `Korepetytor zgłosił przedmiot „${request.subject_name}”. Zgłoszenie oczekuje na rozpatrzenie.`,
              type: 'ADMIN_SUBJECT_REQUEST',
            },
          }),
        ),
      );
      return request;
    });
  }

  async getPendingSubjectRequests() {
    return this.prisma.subjectRequest.findMany({
      where: { status: RequestStatus.PENDING },
      include: {
        tutor: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async getTutorSubjectRequests(tutorId: number) {
    return this.prisma.subjectRequest.findMany({
      where: { tutor_id: tutorId },
      orderBy: { created_at: 'desc' },
      select: {
        id_subject_requests: true,
        subject_name: true,
        description: true,
        status: true,
        created_at: true,
      },
    });
  }

  async reviewSubjectRequest(
    requestId: number,
    reviewerId: number,
    status: RequestStatus,
  ) {
    if (
      status !== RequestStatus.APPROVED &&
      status !== RequestStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Zgłoszenie można tylko zaakceptować lub odrzucić.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const request = await tx.subjectRequest.findUnique({
            where: { id_subject_requests: requestId },
          });

          if (!request) {
            throw new NotFoundException('Zgłoszenie nie zostało znalezione.');
          }

          if (request.status !== RequestStatus.PENDING) {
            throw new ConflictException(
              'To zgłoszenie zostało już rozpatrzone.',
            );
          }

          let subjectId: number | undefined;

          if (status === RequestStatus.APPROVED) {
            const existingSubject = await tx.subject.findFirst({
              where: {
                name: request.subject_name,
                status: 'ACTIVE',
              },
            });

            if (existingSubject) {
              throw new ConflictException(
                'Aktywny przedmiot o tej nazwie już istnieje.',
              );
            }

            const subject = await tx.subject.create({
              data: {
                name: request.subject_name,
                description: request.description,
              },
            });
            subjectId = subject.id_subjects;
          }

          const reviewedRequest = await tx.subjectRequest.update({
            where: { id_subject_requests: requestId },
            data: {
              status,
              reviewed_by: reviewerId,
              reviewed_at: new Date(),
              subject_id: subjectId,
            },
            include: {
              tutor: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
              subject: true,
            },
          });
          await tx.notification.create({
            data: {
              user_id: request.tutor_id,
              title: 'Zaktualizowano zgłoszenie przedmiotu',
              message: `Zgłoszenie przedmiotu „${request.subject_name}” zostało ${
                status === RequestStatus.APPROVED
                  ? 'zaakceptowane'
                  : 'odrzucone'
              }.`,
              type: 'SUBJECT_REQUEST',
            },
          });
          await tx.adminAuditLog.create({
            data: {
              actor_id: reviewerId,
              action:
                status === RequestStatus.APPROVED
                  ? 'SUBJECT_REQUEST_APPROVED'
                  : 'SUBJECT_REQUEST_REJECTED',
              entity_type: 'subject_request',
              entity_id: requestId,
              details: JSON.stringify({
                subjectName: request.subject_name,
                tutorId: request.tutor_id,
              }),
            },
          });
          return reviewedRequest;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Zgłoszenie zostało równocześnie zmienione. Odśwież listę i spróbuj ponownie.',
        );
      }
      throw error;
    }
  }
}
