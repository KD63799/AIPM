import type { OnModuleDestroy } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env';

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new Redis(config.get('REDIS_URL', { infer: true })),
    },
  ],
  exports: [Redis],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
