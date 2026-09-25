import type { ArgumentsHost } from '@nestjs/common';
import { Catch, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

const KNOWN_ERRORS: Record<string, () => Error> = {
  P2002: () => new ConflictException('Cette ressource existe déjà.'),
  P2025: () => new NotFoundException('Ressource introuvable.'),
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  override catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const mapped = KNOWN_ERRORS[error.code];
    super.catch(mapped ? mapped() : error, host);
  }
}
