import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
      select: { id_roles: true },
    });
    if (!role) {
      throw new NotFoundException('Wybrana rola nie jest skonfigurowana.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Użytkownik o podanym adresie email już istnieje.',
      );
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email.trim().toLowerCase(),
        password_hash,
        phone: dto.phone,
        role_id: role.id_roles,
      },
      include: { role: true },
    });

    return {
      message: 'Rejestracja zakończona sukcesem',
      access_token: this.generateToken(
        user.id_users,
        user.email,
        user.role.name,
        user.token_version,
      ),
      user: {
        id: user.id_users,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (
      !user ||
      user.status === 'BLOCKED' ||
      !(await bcrypt.compare(dto.password, user.password_hash))
    ) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło.');
    }

    return {
      message: 'Logowanie udane',
      access_token: this.generateToken(
        user.id_users,
        user.email,
        user.role.name,
        user.token_version,
      ),
      user: {
        id: user.id_users,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id_users: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Użytkownik nie istnieje.');
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('Konto użytkownika jest zablokowane.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Obecne hasło jest nieprawidłowe.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Nowe hasło musi się różnić od obecnego hasła.',
      );
    }

    await this.prisma.user.update({
      where: { id_users: userId },
      data: {
        password_hash: await bcrypt.hash(dto.newPassword, 10),
        token_version: { increment: 1 },
      },
    });

    return {
      message: 'Hasło zostało zmienione pomyślnie.',
    };
  }

  async requestPasswordReset(email: string) {
    this.mailService.assertConfigured();
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id_users: true, email: true, status: true },
    });
    if (!user || user.status === 'BLOCKED') {
      return {
        message:
          'Jeśli konto z tym adresem istnieje i jest aktywne, wysłaliśmy link do zmiany hasła.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: { user_id: user.id_users },
      });
      await tx.passwordResetToken.create({
        data: {
          user_id: user.id_users,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });
    });

    try {
      await this.mailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await this.prisma.passwordResetToken.deleteMany({
        where: { token_hash: tokenHash },
      });
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Nie udało się wysłać wiadomości resetującej. Spróbuj ponownie później.',
      );
    }

    return {
      message:
        'Jeśli konto z tym adresem istnieje i jest aktywne, wysłaliśmy link do zmiany hasła.',
    };
  }

  async resetPassword({ token, newPassword }: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { token_hash: tokenHash },
        select: {
          id_password_reset_tokens: true,
          user_id: true,
          expires_at: true,
          used_at: true,
        },
      });
      if (!resetToken || resetToken.used_at || resetToken.expires_at <= now) {
        throw new BadRequestException(
          'Link do zmiany hasła jest nieprawidłowy lub wygasł.',
        );
      }

      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id_password_reset_tokens: resetToken.id_password_reset_tokens,
          used_at: null,
          expires_at: { gt: now },
        },
        data: { used_at: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(
          'Link do zmiany hasła jest nieprawidłowy lub wygasł.',
        );
      }

      const user = await tx.user.findUnique({
        where: { id_users: resetToken.user_id },
        select: { id_users: true, status: true },
      });
      if (!user || user.status === 'BLOCKED') {
        throw new BadRequestException(
          'Nie można zmienić hasła dla tego konta.',
        );
      }
      await tx.user.update({
        where: { id_users: user.id_users },
        data: {
          password_hash: passwordHash,
          token_version: { increment: 1 },
        },
      });
      await tx.passwordResetToken.deleteMany({
        where: {
          user_id: user.id_users,
          id_password_reset_tokens: { not: resetToken.id_password_reset_tokens },
        },
      });
    });

    return { message: 'Hasło zostało zmienione. Zaloguj się nowym hasłem.' };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id_users: userId },
      data: { token_version: { increment: 1 } },
    });
    return { message: 'Wylogowano ze wszystkich aktywnych sesji.' };
  }

  private generateToken(
    userId: number,
    email: string,
    role: string,
    tokenVersion: number,
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
      tokenVersion,
    });
  }
}
