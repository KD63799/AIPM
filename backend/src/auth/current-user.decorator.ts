import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

/** Id of the user authenticated by the JWT guard. */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  const { userId } = context.switchToHttp().getRequest<AuthenticatedRequest>();
  // Only reachable when used on a @Public() route by mistake.
  if (!userId) throw new UnauthorizedException();
  return userId;
});
