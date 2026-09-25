import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenStore } from './refresh-token.store';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL', { infer: true }) },
      }),
    }),
    // ponytail: in-memory counters, per instance. Move to Redis storage when running several replicas.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 5 }],
      errorMessage: 'Trop de tentatives. Réessayez dans une minute.',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenStore, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
