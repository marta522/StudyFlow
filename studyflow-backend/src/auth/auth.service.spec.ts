import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

describe('AuthService', () => {
  let service: AuthService;
  const transaction = {
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const mailService = {
    assertConfigured: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
  const prisma = {
    role: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockReset();
    transaction.passwordResetToken.findUnique.mockReset();
    transaction.passwordResetToken.updateMany.mockReset();
    transaction.user.findUnique.mockReset();
    prisma.role.findUnique.mockResolvedValue({ id_roles: 2 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user and returns a token without the password hash', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id_users: 7,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      password_hash: data.password_hash,
      role: { name: 'student' },
    }));

    const result = await service.register({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      password: 'secret1',
      role: 'student',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'ada@example.com',
          role_id: 2,
        }),
        include: { role: true },
      }),
    );
    expect(result).toEqual({
      message: 'Rejestracja zakończona sukcesem',
      access_token: 'signed-token',
      user: {
        id: 7,
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        role: 'student',
      },
    });
  });

  it('rejects registration for an existing email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id_users: 1 });

    await expect(
      service.register({
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        password: 'secret1',
        role: 'student',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects login when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'MISSING@example.com', password: 'secret1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'missing@example.com' },
      include: { role: true },
    });
  });

  it('sends a single-use reset token without exposing it in the response', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id_users: 7,
      email: 'ada@example.com',
      status: 'ACTIVE',
    });

    const result = await service.requestPasswordReset(' ADA@example.com ');

    expect(result.message).toContain('Jeśli konto z tym adresem istnieje');
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'ada@example.com',
      expect.any(String),
    );
    const token = mailService.sendPasswordResetEmail.mock.calls[0][1];
    expect(transaction.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 7,
        token_hash: createHash('sha256').update(token).digest('hex'),
        expires_at: expect.any(Date),
      }),
    });
  });

  it('returns the same reset response when the email is not registered', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.requestPasswordReset('missing@example.com');

    expect(result.message).toContain('Jeśli konto z tym adresem istnieje');
    expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('rejects an expired or unknown password reset token', async () => {
    transaction.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'invalid-token', newPassword: 'newsecret123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('updates the password, invalidates sessions, and consumes a valid token', async () => {
    transaction.passwordResetToken.findUnique.mockResolvedValue({
      id_password_reset_tokens: 9,
      user_id: 7,
      expires_at: new Date(Date.now() + 60_000),
      used_at: null,
    });
    transaction.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.findUnique.mockResolvedValue({
      id_users: 7,
      status: 'ACTIVE',
    });

    await service.resetPassword({
      token: 'valid-token',
      newPassword: 'newsecret123',
    });

    expect(transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_users: 7 },
        data: expect.objectContaining({
          password_hash: expect.any(String),
          token_version: { increment: 1 },
        }),
      }),
    );
    expect(transaction.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { used_at: expect.any(Date) },
      }),
    );
  });
});
