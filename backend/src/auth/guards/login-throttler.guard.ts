import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Throttles per targeted account rather than per IP, so it holds behind any proxy. */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: { body?: { email?: unknown } }): Promise<string> {
    return Promise.resolve(String(request.body?.email).trim().toLowerCase());
  }
}
