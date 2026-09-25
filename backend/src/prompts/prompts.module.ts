import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module';
import { TagsModule } from '../tags/tags.module';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

@Module({
  imports: [FoldersModule, TagsModule],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
