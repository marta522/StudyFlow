import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as never);
  });

  it('lists only the requesting user’s notifications', async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await service.getForUser(7);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { user_id: 7 },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  });

  it('does not mark another user’s notification as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markRead(7, 22)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_notifications: 22, user_id: 7 },
      }),
    );
  });

  it('returns the number of unread notifications marked as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    await expect(service.markAllRead(7)).resolves.toEqual({ updated: 3 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 7, read_at: null },
      }),
    );
  });
});
