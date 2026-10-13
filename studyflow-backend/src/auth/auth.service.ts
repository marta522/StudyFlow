import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
