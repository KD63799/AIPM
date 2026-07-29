import { Controller, Get } from '@nestjs/common';

/** Liveness/readiness probe target. Must stay free of any DB or Redis dependency. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
