import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AssignTutorSubjectDto } from './dto/assign-tutor-subject.dto';
import { CreateSubjectRequestDto } from './dto/create-subject-request.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { ReviewSubjectRequestDto } from './dto/review-subject-request.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsService } from './subjects.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  findAllForAdmin() {
    return this.subjectsService.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.createSubject(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  updateSubject(
    @Param('id', ParseIntPipe) subjectId: number,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.updateSubject(subjectId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tutor')
  @Post('my-offer')
  assignToTutor(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AssignTutorSubjectDto,
  ) {
    return this.subjectsService.assignToTutor(request.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tutor')
  @Get('my-offer')
  getMySubjects(@Req() request: AuthenticatedRequest) {
    return this.subjectsService.getTutorSubjects(request.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tutor')
  @Post('requests')
  createSubjectRequest(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSubjectRequestDto,
  ) {
    return this.subjectsService.createSubjectRequest(request.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('requests')
  getPendingSubjectRequests() {
    return this.subjectsService.getPendingSubjectRequests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('requests/:id')
  reviewSubjectRequest(
    @Param('id', ParseIntPipe) requestId: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ReviewSubjectRequestDto,
  ) {
    return this.subjectsService.reviewSubjectRequest(
      requestId,
      request.user.id,
      dto.status,
    );
  }
}
