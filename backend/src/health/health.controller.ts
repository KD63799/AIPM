import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/** Liveness/readiness probe target. Must stay free of any DB or Redis dependency. */
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
