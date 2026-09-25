import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);
  app.enableShutdownHooks();
  await app.listen(app.get(ConfigService<Env, true>).get('PORT', { infer: true }));
}

void bootstrap();
