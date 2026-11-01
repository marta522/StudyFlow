import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: number, notificationId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { id_notifications: notificationId, user_id: userId },
      data: { read_at: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Powiadomienie nie zostało znalezione.');
    }
    return { id_notifications: notificationId, read: true };
  }

  async markAllRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    return { updated: result.count };
  }
}
