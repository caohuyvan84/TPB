import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisClientService.name);
  private _client!: Redis;

  constructor(private configService: ConfigService) {}

  /** Expose the raw ioredis client for advanced operations. */
  get client(): Redis {
    return this._client;
  }

  async onModuleInit() {
    this._client = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this._client.on('connect', () => this.logger.log('Redis connected'));
    this._client.on('error', (err) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this._client?.quit();
  }

  /* ── Convenience wrappers ─────────────────────────── */

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this._client.setex(key, ttl, value);
    } else {
      await this._client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this._client.get(key);
  }

  async del(key: string): Promise<void> {
    await this._client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this._client.exists(key)) === 1;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this._client.hset(key, field, value);
  }

  async hmset(key: string, data: Record<string, string>): Promise<void> {
    await this._client.hmset(key, data);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this._client.hgetall(key);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this._client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this._client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this._client.smembers(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this._client.expire(key, seconds);
  }
}
