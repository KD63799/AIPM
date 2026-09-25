import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_FIELDS = { id: true, email: true, createdAt: true } satisfies Prisma.UserSelect;
export type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_FIELDS }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(email: string, passwordHash: string): Promise<PublicUser> {
    return this.prisma.user.create({ data: { email, passwordHash }, select: PUBLIC_FIELDS });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  /** Throws unless `password` matches, so callers can gate sensitive actions on it. */
  async assertPassword(id: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw new BadRequestException('Mot de passe incorrect.');
    }
  }

  async setPassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await argon2.hash(password) },
    });
  }

  async remove(id: string, password: string): Promise<void> {
    await this.assertPassword(id, password);
    await this.prisma.user.delete({ where: { id } });
  }
}
