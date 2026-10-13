import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchStudentsDto } from './dto/search-students.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'tutor')
@Controller('students')
export class StudentsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findStudents(
    @Req() request: AuthenticatedRequest,
    @Query() query: SearchStudentsDto,
  ) {
    return this.usersService.findStudents(
      request.user.id,
      request.user.role,
      query.q,
    );
  }
}
