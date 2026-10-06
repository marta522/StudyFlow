import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { TutorsService } from './tutors.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('tutors/me')
export class StudentTutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Get('my-tutors')
  getMyTutors(@Req() request: AuthenticatedRequest) {
    return this.tutorsService.getMyTutors(request.user.id);
  }
}
