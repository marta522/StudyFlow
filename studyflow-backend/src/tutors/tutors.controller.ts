import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateTutorProfileDto } from './dto/update-tutor-profile.dto';
import { TutorsService } from './tutors.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tutor')
@Controller('tutors/me')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Get('profile')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.tutorsService.getProfile(request.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateTutorProfileDto,
  ) {
    return this.tutorsService.updateProfile(request.user.id, dto);
  }

  @Get('stats')
  getStats(@Req() request: AuthenticatedRequest) {
    return this.tutorsService.getStats(request.user.id);
  }

  @Get('availability')
  getAvailability(@Req() request: AuthenticatedRequest) {
    return this.tutorsService.getAvailability(request.user.id);
  }

  @Post('availability')
  createAvailability(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.tutorsService.createAvailability(request.user.id, dto);
  }

  @Delete('availability/:id')
  deleteAvailability(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) availabilityId: number,
  ) {
    return this.tutorsService.deleteAvailability(
      request.user.id,
      availabilityId,
    );
  }
}
