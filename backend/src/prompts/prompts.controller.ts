import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { ListPromptsQuery } from './dto/list-prompts.query';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import type { PromptView, VersionView } from './prompts.service';
import { PromptsService } from './prompts.service';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly prompts: PromptsService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query() query: ListPromptsQuery): Promise<PromptView[]> {
    return this.prompts.list(userId, query);
  }

  @Get(':id')
  get(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<PromptView> {
    return this.prompts.get(userId, id);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreatePromptDto): Promise<PromptView> {
    return this.prompts.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptDto,
  ): Promise<PromptView> {
    return this.prompts.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.prompts.remove(userId, id);
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PromptView> {
    return this.prompts.duplicate(userId, id);
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  use(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<PromptView> {
    return this.prompts.use(userId, id);
  }

  @Get(':id/versions')
  versions(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VersionView[]> {
    return this.prompts.versions(userId, id);
  }

  @Post(':id/versions/:versionNumber/restore')
  restore(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ): Promise<PromptView> {
    return this.prompts.restore(userId, id, versionNumber);
  }
}
