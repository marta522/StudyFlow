import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateGradeDto } from './dto/create-grade.dto';
import { GradesService } from './grades.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Roles('tutor')
  @Post()
  addGrade(@Req() request: AuthenticatedRequest, @Body() dto: CreateGradeDto) {
    return this.gradesService.createGrade(request.user.id, dto);
  }

  @Roles('student')
  @Get('my-grades')
  getMyGrades(@Req() request: AuthenticatedRequest) {
    return this.gradesService.getStudentGrades(
      request.user.id,
      request.user.id,
      request.user.role,
    );
  }

  @Roles('admin', 'tutor')
  @Get('student/:studentId')
  getStudentGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.gradesService.getStudentGrades(
      studentId,
      request.user.id,
      request.user.role,
    );
  }
}
