import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getForUser(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getForUser(request.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(request.user.id);
  }

  @Patch(':id/read')
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    return this.notificationsService.markRead(request.user.id, notificationId);
  }
}
