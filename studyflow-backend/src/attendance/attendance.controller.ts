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
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('tutor')
  @Post()
  markAttendance(
    @Req() request: AuthenticatedRequest,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendanceService.markAttendance(request.user.id, dto);
  }

  @Roles('student', 'tutor', 'admin')
  @Get('booking/:bookingId')
  getAttendance(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.getAttendanceForBooking(
      bookingId,
      request.user.id,
      request.user.role,
    );
  }
}
