import { BadRequestException, ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  const prisma = {
    subject: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  let service: SubjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubjectsService(prisma as never);
  });

  it('creates a subject with a normalized name', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);
    prisma.subject.create.mockResolvedValue({
      id_subjects: 4,
      name: 'Matematyka',
      description: null,
    });

    await expect(
      service.createSubject({ name: 'Matematyka', description: undefined }),
    ).resolves.toMatchObject({ id_subjects: 4, name: 'Matematyka' });
    expect(prisma.subject.create).toHaveBeenCalledWith({
      data: { name: 'Matematyka', description: undefined },
    });
  });

  it('rejects duplicate subject names before inserting', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id_subjects: 2 });

    await expect(
      service.createSubject({ name: 'Matematyka' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.subject.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent duplicate subject insert to a conflict', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);
    prisma.subject.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createSubject({ name: 'Matematyka' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
