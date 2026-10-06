import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
        email: dto.email,
        password_hash,
        phone: dto.phone,
        role_id: dto.role_id,
      },
      include: { role: true },
    });

    return {
      message: 'Rejestracja zakończona sukcesem',
      access_token: this.generateToken(
        user.id_users,
        user.email,
        user.role.name,
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

  private generateToken(userId: number, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}
