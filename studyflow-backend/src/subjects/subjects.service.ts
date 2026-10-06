import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

    return this.prisma.subjectRequest.create({
      data: {
        tutor_id: tutorId,
        subject_name: dto.subject_name,
        description: dto.description,
      },
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

          return tx.subjectRequest.update({
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
