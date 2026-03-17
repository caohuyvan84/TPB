import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
  ) {}

  async listNotifications(agentId: string, limit = 50) {
    return this.notificationRepo.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(agentId: string) {
    return this.notificationRepo.count({
      where: { agentId, state: 'new' },
    });
  }

  async updateState(id: string, state: string) {
    await this.notificationRepo.update(id, { state });
    return this.notificationRepo.findOne({ where: { id } });
  }

  async markAllRead(agentId: string) {
    await this.notificationRepo.update(
      { agentId, state: 'new' },
      { state: 'viewed' },
    );
    return { success: true };
  }

  async createNotification(data: Partial<Notification>) {
    const notification = this.notificationRepo.create(data);
    return this.notificationRepo.save(notification);
  }
}
