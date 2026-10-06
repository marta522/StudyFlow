import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { SearchScheduleDto } from './dto/search-schedule.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles('tutor')
  @Post('lessons')
  createLesson(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateLessonDto,
  ) {
    return this.bookingsService.createLesson(request.user.id, dto);
  }

  @Roles('tutor')
  @Patch('lessons/:id')
  updateLesson(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) lessonId: number,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.bookingsService.updateLesson(
      request.user.id,
      lessonId,
      dto,
    );
  }

  @Roles('tutor')
  @Delete('lessons/:id')
  deleteLesson(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) lessonId: number,
  ) {
    return this.bookingsService.deleteLesson(request.user.id, lessonId);
  }

  @Roles('student', 'tutor', 'admin')
  @Get('available')
  getAvailable() {
    return this.bookingsService.getAvailableLessons();
  }

  @Roles('student')
  @Post('book')
  bookLesson(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.bookLesson(request.user.id, dto);
  }

  @Roles('student', 'tutor', 'admin')
  @Get('my-bookings')
  getMyBookings(@Req() request: AuthenticatedRequest) {
    return this.bookingsService.getUserBookings(
      request.user.id,
      request.user.role,
    );
  }

  @Roles('admin')
  @Get('schedule')
  getAdminSchedule(@Query() query: SearchScheduleDto) {
    return this.bookingsService.getAdminSchedule(query);
  }
}
