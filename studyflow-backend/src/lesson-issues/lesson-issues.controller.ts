import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateLessonIssueDto } from './dto/create-lesson-issue.dto';
import { UpdateLessonIssueDto } from './dto/update-lesson-issue.dto';
import { LessonIssuesService } from './lesson-issues.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lesson-issues')
export class LessonIssuesController {
  constructor(private readonly service: LessonIssuesService) {}

  @Roles('student', 'tutor')
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateLessonIssueDto,
  ) {
    return this.service.create(request.user.id, request.user.role, dto);
  }

  @Roles('student', 'tutor')
  @Get('mine')
  getMine(@Req() request: AuthenticatedRequest) {
    return this.service.getForReporter(request.user.id);
  }

  @Roles('admin')
  @Get('admin')
  getForAdmin(@Query('status') status?: string) {
    return this.service.getForAdmin(status);
  }

  @Roles('admin')
  @Patch('admin/:id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) issueId: number,
    @Body() dto: UpdateLessonIssueDto,
  ) {
    return this.service.updateForAdmin(request.user.id, issueId, dto);
  }
}
