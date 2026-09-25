import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import type { CreatePromptDto } from './dto/create-prompt.dto';
import type { ListPromptsQuery, PromptSort } from './dto/list-prompts.query';
import type { UpdatePromptDto } from './dto/update-prompt.dto';
import type { VariableDto } from './dto/variable.dto';
import { parseVariableNames } from './prompt-variables';

const PROMPT_INCLUDE = {
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  variables: { select: { name: true, defaultValue: true, description: true } },
} satisfies Prisma.PromptInclude;

type PromptRow = Prisma.PromptGetPayload<{ include: typeof PROMPT_INCLUDE }>;
type Variable = PromptRow['variables'][number];
type Tag = PromptRow['tags'][number]['tag'];

export type PromptView = Omit<PromptRow, 'userId' | 'lastVersion' | 'tags'> & {
  version: number;
  tags: Tag[];
};
export type VersionView = {
  versionNumber: number;
  title: string;
  content: string;
  createdAt: Date;
};

const ORDER_BY: Record<Exclude<PromptSort, 'title'>, Prisma.PromptOrderByWithRelationInput> = {
  recent: { updatedAt: 'desc' },
  used: { usageCount: 'desc' },
  lastUsed: { lastUsedAt: { sort: 'desc', nulls: 'last' } },
};

function toView({ userId: _, lastVersion, tags, variables, ...prompt }: PromptRow): PromptView {
  const order = parseVariableNames(prompt.content);
  return {
    ...prompt,
    version: lastVersion,
    tags: tags.map((t) => t.tag).sort((a, b) => a.name.localeCompare(b.name)),
    variables: variables.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
  };
}

/** One row per `{{name}}` in `content`: overrides win, then what was already stored. */
function syncVariables(
  content: string,
  overrides: VariableDto[] = [],
  existing: Variable[] = [],
): Variable[] {
  return parseVariableNames(content).map((name) => {
    const source = overrides.find((v) => v.name === name) ?? existing.find((v) => v.name === name);
    return {
      name,
      defaultValue: source?.defaultValue ?? null,
      description: source?.description ?? null,
    };
  });
}

@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
  ) {}

  // ponytail: no pagination, a personal library stays in the hundreds. Add cursor paging past that.
  async list(userId: string, query: ListPromptsQuery): Promise<PromptView[]> {
    const q = query.q ? { contains: query.q, mode: 'insensitive' as const } : undefined;
    const prompts = await this.prisma.prompt.findMany({
      where: {
        userId,
        folderId: query.folderId,
        isFavorite: query.favorite || undefined,
        tags: query.tagId ? { some: { tagId: query.tagId } } : undefined,
        OR: q && [
          { title: q },
          { description: q },
          { content: q },
          { tags: { some: { tag: { name: q } } } },
        ],
      },
      include: PROMPT_INCLUDE,
      orderBy: query.sort === 'title' ? undefined : ORDER_BY[query.sort ?? 'recent'],
    });
    const views = prompts.map(toView);
    // Sorted here rather than in SQL: the database collation may be case-sensitive.
    return query.sort === 'title'
      ? views.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
      : views;
  }

  async get(userId: string, id: string): Promise<PromptView> {
    return toView(await this.findOwned(userId, id));
  }

  async create(userId: string, dto: CreatePromptDto): Promise<PromptView> {
    await this.assertReferences(userId, dto);
    const prompt = await this.prisma.prompt.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        description: dto.description,
        folderId: dto.folderId,
        isFavorite: dto.isFavorite,
        lastVersion: 1,
        versions: { create: { versionNumber: 1, title: dto.title, content: dto.content } },
        tags: { create: dto.tagIds?.map((tagId) => ({ tagId })) },
        variables: { create: syncVariables(dto.content, dto.variables) },
      },
      include: PROMPT_INCLUDE,
    });
    return toView(prompt);
  }

  /** A new version is recorded whenever the title or the content changes. */
  async update(userId: string, id: string, dto: UpdatePromptDto): Promise<PromptView> {
    const current = await this.findOwned(userId, id);
    await this.assertReferences(userId, dto);
    const title = dto.title ?? current.title;
    const content = dto.content ?? current.content;
    const isNewVersion = title !== current.title || content !== current.content;

    const prompt = await this.prisma.prompt.update({
      where: { id },
      data: {
        title,
        content,
        description: dto.description,
        folderId: dto.folderId,
        isFavorite: dto.isFavorite,
        lastVersion: isNewVersion ? current.lastVersion + 1 : undefined,
        versions: isNewVersion
          ? { create: { versionNumber: current.lastVersion + 1, title, content } }
          : undefined,
        tags: dto.tagIds && {
          deleteMany: {},
          create: dto.tagIds.map((tagId) => ({ tagId })),
        },
        variables: {
          deleteMany: {},
          create: syncVariables(content, dto.variables, current.variables),
        },
      },
      include: PROMPT_INCLUDE,
    });
    return toView(prompt);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.prompt.delete({ where: { id, userId } });
  }

  async duplicate(userId: string, id: string): Promise<PromptView> {
    const source = await this.findOwned(userId, id);
    return this.create(userId, {
      title: `${source.title} (copie)`,
      content: source.content,
      description: source.description,
      folderId: source.folderId,
      tagIds: source.tags.map((t) => t.tag.id),
      variables: source.variables,
    });
  }

  async use(userId: string, id: string): Promise<PromptView> {
    const prompt = await this.prisma.prompt.update({
      where: { id, userId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      include: PROMPT_INCLUDE,
    });
    return toView(prompt);
  }

  async versions(userId: string, id: string): Promise<VersionView[]> {
    await this.findOwned(userId, id);
    return this.prisma.promptVersion.findMany({
      where: { promptId: id },
      select: { versionNumber: true, title: true, content: true, createdAt: true },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async restore(userId: string, id: string, versionNumber: number): Promise<PromptView> {
    await this.findOwned(userId, id);
    const version = await this.prisma.promptVersion.findUnique({
      where: { promptId_versionNumber: { promptId: id, versionNumber } },
    });
    if (!version) throw new NotFoundException('Version introuvable.');
    return this.update(userId, id, { title: version.title, content: version.content });
  }

  private async findOwned(userId: string, id: string): Promise<PromptRow> {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, userId },
      include: PROMPT_INCLUDE,
    });
    if (!prompt) throw new NotFoundException('Prompt introuvable.');
    return prompt;
  }

  private async assertReferences(
    userId: string,
    { folderId, tagIds }: { folderId?: string | null; tagIds?: string[] },
  ): Promise<void> {
    if (folderId) await this.folders.assertOwned(userId, folderId);
    if (tagIds?.length) await this.tags.assertOwned(userId, tagIds);
  }
}
