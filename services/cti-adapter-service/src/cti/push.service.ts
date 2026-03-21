import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webPush = require('web-push');

/**
 * PushService — manages Web Push subscriptions and sends push notifications.
 * Uses `web-push` npm package for VAPID-authenticated push delivery.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private redis: Redis;
  private vapidConfigured = false;

  constructor() {
    this.redis = new Redis(process.env['REDIS_URL'] || 'redis://localhost:6379');

    // Configure VAPID keys
    const vapidPublic = process.env['VAPID_PUBLIC_KEY'] || '';
    const vapidPrivate = process.env['VAPID_PRIVATE_KEY'] || '';
    const vapidEmail = process.env['VAPID_EMAIL'] || 'mailto:admin@tpb.vn';

    if (vapidPublic && vapidPrivate) {
      webPush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
      this.vapidConfigured = true;
      this.logger.log('Web Push VAPID configured');
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  /** Save push subscription for an agent. */
  async saveSubscription(agentId: string, subscription: any): Promise<void> {
    const key = `push:sub:${agentId}`;
    await this.redis.set(key, JSON.stringify(subscription), 'EX', 7 * 86400); // 7 days TTL
    this.logger.log(`Push subscription saved for ${agentId}`);
  }

  /** Remove push subscription for an agent. */
  async removeSubscription(agentId: string): Promise<void> {
    await this.redis.del(`push:sub:${agentId}`);
    this.logger.log(`Push subscription removed for ${agentId}`);
  }

  /** Save agent tab status (for Layer 1/2 coordination). */
  async saveTabStatus(agentId: string, status: { tabVisible: boolean; audioActive: boolean; sipRegistered: boolean }): Promise<void> {
    const key = `push:tab:${agentId}`;
    await this.redis.set(key, JSON.stringify({ ...status, updatedAt: Date.now() }), 'EX', 300); // 5 min TTL
  }

  /** Get agent tab status. */
  async getTabStatus(agentId: string): Promise<{ tabVisible: boolean; audioActive: boolean; sipRegistered: boolean; updatedAt: number } | null> {
    const data = await this.redis.get(`push:tab:${agentId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Send push notification to an agent.
   * Checks Layer 1/2 coordination: only push if audio is not active or tab status is stale.
   */
  async sendPush(agentId: string, payload: Record<string, unknown>): Promise<boolean> {
    if (!this.vapidConfigured) return false;

    // Layer coordination: skip push if agent tab is active with audio running
    const tabStatus = await this.getTabStatus(agentId);
    if (tabStatus) {
      const isRecent = Date.now() - tabStatus.updatedAt < 120000; // updated within 2 min
      if (isRecent && tabStatus.tabVisible && tabStatus.audioActive && tabStatus.sipRegistered) {
        this.logger.debug(`Skip push for ${agentId} — tab active with audio (Layer 1 sufficient)`);
        return false;
      }
    }

    // Get subscription
    const subJson = await this.redis.get(`push:sub:${agentId}`);
    if (!subJson) {
      this.logger.debug(`No push subscription for ${agentId}`);
      return false;
    }

    try {
      const subscription = JSON.parse(subJson);
      await webPush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 25, // seconds — match GoACD bridge timeout
        urgency: 'high',
        topic: payload['callId'] ? `call-${payload['callId']}` : undefined,
      });
      this.logger.log(`Push sent to ${agentId}: ${payload['type']}`);
      return true;
    } catch (err: any) {
      // 410 Gone = subscription expired
      if (err?.statusCode === 410) {
        this.logger.warn(`Push subscription expired for ${agentId}, removing`);
        await this.removeSubscription(agentId);
      } else {
        this.logger.error(`Push send failed for ${agentId}: ${err?.message}`);
      }
      return false;
    }
  }
}
