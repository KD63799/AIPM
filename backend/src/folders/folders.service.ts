import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFolderDto } from './dto/create-folder.dto';
import type { UpdateFolderDto } from './dto/update-folder.dto';

const FOLDER_FIELDS = {
  id: true,
  name: true,
  parentId: true,
  _count: { select: { prompts: true } },
} satisfies Prisma.FolderSelect;

type FolderRow = Prisma.FolderGetPayload<{ select: typeof FOLDER_FIELDS }>;
export type FolderView = Omit<FolderRow, '_count'> & { promptCount: number };

const toView = ({ _count, ...folder }: FolderRow): FolderView => ({
  ...folder,
  promptCount: _count.prompts,
});

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<FolderView[]> {
    const folders = await this.prisma.folder.findMany({
      where: { userId },
      select: FOLDER_FIELDS,
      orderBy: { name: 'asc' },
    });
    return folders.map(toView);
  }

  async create(userId: string, dto: CreateFolderDto): Promise<FolderView> {
    if (dto.parentId) await this.assertOwned(userId, dto.parentId);
    return toView(
      await this.prisma.folder.create({
        data: { userId, name: dto.name, parentId: dto.parentId },
        select: FOLDER_FIELDS,
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateFolderDto): Promise<FolderView> {
    if (dto.parentId) await this.assertCanMove(userId, id, dto.parentId);
    return toView(
      await this.prisma.folder.update({
        where: { id, userId },
        data: { name: dto.name, parentId: dto.parentId },
        select: FOLDER_FIELDS,
      }),
    );
  }

  /** Sub-folders and prompts are lifted to the deleted folder's parent, never lost. */
  async remove(userId: string, id: string): Promise<void> {
    const folder = await this.prisma.folder.findFirst({ where: { id, userId } });
    if (!folder) throw new NotFoundException('Dossier introuvable.');
    await this.prisma.$transaction([
      this.prisma.folder.updateMany({
        where: { parentId: id },
        data: { parentId: folder.parentId },
      }),
      this.prisma.prompt.updateMany({
        where: { folderId: id },
        data: { folderId: folder.parentId },
      }),
      this.prisma.folder.delete({ where: { id } }),
    ]);
  }

  async assertOwned(userId: string, id: string): Promise<void> {
    if (!(await this.prisma.folder.count({ where: { id, userId } }))) {
      throw new NotFoundException('Dossier introuvable.');
    }
  }

  private async assertCanMove(userId: string, id: string, parentId: string): Promise<void> {
    const folders = await this.prisma.folder.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    });
    const parentOf = new Map(folders.map((f) => [f.id, f.parentId]));
    if (!parentOf.has(id) || !parentOf.has(parentId)) {
      throw new NotFoundException('Dossier introuvable.');
    }
    for (
      let ancestor: string | null | undefined = parentId;
      ancestor;
      ancestor = parentOf.get(ancestor)
    ) {
      if (ancestor === id) {
        throw new BadRequestException(
          'Un dossier ne peut pas être déplacé dans lui-même ni dans un de ses sous-dossiers.',
        );
      }
    }
  }
}
