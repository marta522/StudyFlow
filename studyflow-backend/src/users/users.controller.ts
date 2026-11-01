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
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { GenerateFinancialReportDto } from './dto/generate-financial-report.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { SearchAuditLogDto } from './dto/search-audit-log.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findStudentsAndTutors() {
    return this.usersService.findStudentsAndTutors();
  }

  @Post()
  createManagedUser(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateManagedUserDto,
  ) {
    return this.usersService.createManagedUser(request.user.id, dto);
  }

  @Get('metrics')
  getDashboardMetrics() {
    return this.usersService.getDashboardMetrics();
  }

  @Get('audit')
  getAuditLog(@Query() query: SearchAuditLogDto) {
    return this.usersService.getAuditLog(query);
  }

  @Get(':id/activity')
  getUserActivity(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.getUserActivity(userId);
  }

  @Get('reports/financial')
  getFinancialReports() {
    return this.usersService.getFinancialReports();
  }

  @Get('reports/financial/:id')
  getFinancialReport(@Param('id', ParseIntPipe) reportId: number) {
    return this.usersService.getFinancialReport(reportId);
  }

  @Post('reports/financial')
  generateFinancialReport(
    @Req() request: AuthenticatedRequest,
    @Body() dto: GenerateFinancialReportDto,
  ) {
    return this.usersService.generateFinancialReport(request.user.id, dto);
  }

  @Patch(':id')
  updateUser(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(request.user.id, userId, dto);
  }

  @Patch(':id/status')
  updateUserStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(request.user.id, userId, dto);
  }

  @Delete(':id')
  deleteTutor(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) userId: number,
  ) {
    return this.usersService.deleteTutor(request.user.id, userId);
  }
}
