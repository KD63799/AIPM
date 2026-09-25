import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [PromptsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
