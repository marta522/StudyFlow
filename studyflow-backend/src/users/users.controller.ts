import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
  createManagedUser(@Body() dto: CreateManagedUserDto) {
    return this.usersService.createManagedUser(dto);
  }

  @Get('metrics')
  getDashboardMetrics() {
    return this.usersService.getDashboardMetrics();
  }

  @Get('reports/financial')
  getFinancialReports() {
    return this.usersService.getFinancialReports();
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
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, dto);
  }

  @Patch(':id/status')
  updateUserStatus(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(userId, dto);
  }

  @Delete(':id')
  deleteTutor(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.deleteTutor(userId);
  }
}
