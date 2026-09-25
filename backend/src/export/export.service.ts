import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts/prompts.service';
import type { LibraryDto, LibraryPromptDto } from './dto/library.dto';
import { LIBRARY_FORMAT } from './dto/library.dto';

export type ImportResult = { folders: number; tags: number; prompts: number };

type FolderRow = { id: string; name: string; parentId: string | null };

const DEFAULT_TAG_COLOR = '#64748b';
const UNFILED = 'Sans dossier';

function folderPaths(folders: FolderRow[]): Map<string, string[]> {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const paths = new Map<string, string[]>();
  for (const folder of folders) {
    const path: string[] = [];
    for (
      let f: FolderRow | undefined = folder;
      f;
      f = f.parentId ? byId.get(f.parentId) : undefined
    ) {
      path.unshift(f.name);
    }
    paths.set(folder.id, path);
  }
  return paths;
}

function comparePaths(a: string[], b: string[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const order = a[i].localeCompare(b[i], 'fr', { sensitivity: 'base' });
    if (order) return order;
  }
  return a.length - b.length;
}

/** A fence longer than any backtick run inside `content`, so the block can't end early. */
function fenced(content: string): string {
  const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${content}\n${fence}`;
}

function promptToMarkdown(prompt: LibraryPromptDto): string {
  const parts = [`### ${prompt.title}`];
  if (prompt.description) parts.push(`> ${prompt.description}`);
  const meta = [
    prompt.tags?.length ? `Tags : ${prompt.tags.map((t) => `\`${t}\``).join(', ')}` : '',
    prompt.isFavorite ? '★ Favori' : '',
  ].filter(Boolean);
  if (meta.length) parts.push(meta.join(' · '));
  if (prompt.variables?.length) {
    const lines = prompt.variables.map((v) =>
      [`- \`${v.name}\``, v.defaultValue && `défaut : ${v.defaultValue}`, v.description]
        .filter(Boolean)
        .join(' — '),
    );
    parts.push(`Variables :\n\n${lines.join('\n')}`);
  }
  parts.push(fenced(prompt.content));
  return parts.join('\n\n');
}

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prompts: PromptsService,
  ) {}

  async exportLibrary(userId: string): Promise<LibraryDto> {
    const [folders, tags, prompts] = await Promise.all([
      this.prisma.folder.findMany({
        where: { userId },
        select: { id: true, name: true, parentId: true },
      }),
      this.prisma.tag.findMany({
        where: { userId },
        select: { name: true, color: true },
        orderBy: { name: 'asc' },
      }),
      this.prompts.list(userId, { sort: 'title' }),
    ]);
    const pathOf = folderPaths(folders);
    return {
      format: LIBRARY_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      folders: [...pathOf.values()].sort(comparePaths).map((path) => ({ path })),
      tags,
      prompts: prompts.map((p) => ({
        title: p.title,
        description: p.description,
        content: p.content,
        folder: (p.folderId && pathOf.get(p.folderId)) || null,
        tags: p.tags.map((t) => t.name),
        isFavorite: p.isFavorite,
        variables: p.variables,
      })),
    };
  }

  async exportMarkdown(userId: string): Promise<string> {
    const library = await this.exportLibrary(userId);
    const sections = [...library.folders.map((f) => f.path), null].flatMap((path) => {
      const key = JSON.stringify(path);
      const prompts = library.prompts.filter((p) => JSON.stringify(p.folder ?? null) === key);
      if (!prompts.length) return [];
      return [`## ${path ? path.join(' / ') : UNFILED}`, ...prompts.map(promptToMarkdown)];
    });
    const date = new Date().toLocaleDateString('fr-FR');
    return (
      [
        '# Bibliothèque de prompts',
        `Exporté le ${date} · ${library.prompts.length} prompts`,
        ...sections,
      ].join('\n\n') + '\n'
    );
  }

  /** Merges into the account: folders matched by path, tags by name, prompts always added. */
  async importLibrary(userId: string, library: LibraryDto): Promise<ImportResult> {
    const created: ImportResult = { folders: 0, tags: 0, prompts: 0 };
    const [folders, tags] = await Promise.all([
      this.prisma.folder.findMany({
        where: { userId },
        select: { id: true, name: true, parentId: true },
      }),
      this.prisma.tag.findMany({ where: { userId }, select: { id: true, name: true } }),
    ]);
    const folderIdByPath = new Map(
      [...folderPaths(folders)].map(([id, path]) => [JSON.stringify(path), id]),
    );
    const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));
    const colorOf = new Map(library.tags.map((t) => [t.name, t.color]));

    const ensureFolder = async (path: string[]): Promise<string> => {
      const key = JSON.stringify(path);
      const known = folderIdByPath.get(key);
      if (known) return known;
      const parentId = path.length > 1 ? await ensureFolder(path.slice(0, -1)) : null;
      const { id } = await this.prisma.folder.create({
        data: { userId, name: path[path.length - 1], parentId },
      });
      folderIdByPath.set(key, id);
      created.folders++;
      return id;
    };

    const ensureTag = async (name: string): Promise<string> => {
      const known = tagIdByName.get(name);
      if (known) return known;
      const { id } = await this.prisma.tag.create({
        data: { userId, name, color: colorOf.get(name) ?? DEFAULT_TAG_COLOR },
      });
      tagIdByName.set(name, id);
      created.tags++;
      return id;
    };

    // ponytail: sequential and not transactional; a failure mid-way keeps what was imported.
    for (const tag of library.tags) await ensureTag(tag.name);
    for (const folder of library.folders) await ensureFolder(folder.path);
    for (const prompt of library.prompts) {
      const tagIds: string[] = [];
      for (const name of new Set(prompt.tags)) tagIds.push(await ensureTag(name));
      await this.prompts.create(userId, {
        title: prompt.title,
        content: prompt.content,
        description: prompt.description,
        isFavorite: prompt.isFavorite,
        variables: prompt.variables,
        folderId: prompt.folder ? await ensureFolder(prompt.folder) : null,
        tagIds,
      });
      created.prompts++;
    }
    return created;
  }
}
