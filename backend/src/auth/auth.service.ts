import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import type { PublicUser } from '../users/users.service';
import { UsersService } from '../users/users.service';
import type { AccessTokenPayload } from './guards/jwt-auth.guard';
import { RefreshTokenStore } from './refresh-token.store';

export type Session = { accessToken: string; refreshToken: string; user: PublicUser };

@Injectable()
export class AuthService {
  // Verifying unknown emails against a throwaway hash makes them as slow as a wrong password.
  private readonly decoyHash = argon2.hash(randomUUID());

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly tokens: RefreshTokenStore,
  ) {}

  async register(email: string, password: string): Promise<Session> {
    return this.openSession(await this.users.create(email, await argon2.hash(password)));
  }

  async login(email: string, password: string): Promise<Session> {
    const user = await this.users.findByEmail(email);
    const valid = await argon2.verify(user?.passwordHash ?? (await this.decoyHash), password);
    if (!user || !valid) throw new UnauthorizedException('Email ou mot de passe incorrect.');
    return this.openSession({ id: user.id, email: user.email, createdAt: user.createdAt });
  }

  async refresh(refreshToken: string | undefined): Promise<Session> {
    const rotated = refreshToken ? await this.tokens.rotate(refreshToken) : null;
    const user = rotated ? await this.users.findById(rotated.userId) : null;
    if (!rotated || !user) throw new UnauthorizedException('Session expirée.');
    return { accessToken: await this.accessToken(user.id), refreshToken: rotated.token, user };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }

  /** Signs out every session, then returns a fresh refresh token for the current device. */
  async changePassword(userId: string, current: string, next: string): Promise<string> {
    await this.users.assertPassword(userId, current);
    await this.users.setPassword(userId, next);
    await this.tokens.revokeAll(userId);
    return this.tokens.issue(userId);
  }

  private async openSession(user: PublicUser): Promise<Session> {
    return {
      accessToken: await this.accessToken(user.id),
      refreshToken: await this.tokens.issue(user.id),
      user,
    };
  }

  private accessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId } satisfies AccessTokenPayload);
  }
}
