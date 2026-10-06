import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id_users: payload.sub },
      include: { role: true },
    });

    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException('Konto nieaktywne lub nie istnieje.');
    }

    return {
      id: user.id_users,
      email: user.email,
      role: user.role.name,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  }
}
