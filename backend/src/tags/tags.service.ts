import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTagDto } from './dto/create-tag.dto';
import type { UpdateTagDto } from './dto/update-tag.dto';

const TAG_FIELDS = {
  id: true,
  name: true,
  color: true,
  _count: { select: { prompts: true } },
} satisfies Prisma.TagSelect;

type TagRow = Prisma.TagGetPayload<{ select: typeof TAG_FIELDS }>;
export type TagView = Omit<TagRow, '_count'> & { promptCount: number };

const toView = ({ _count, ...tag }: TagRow): TagView => ({ ...tag, promptCount: _count.prompts });

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<TagView[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      select: TAG_FIELDS,
      orderBy: { name: 'asc' },
    });
    return tags.map(toView);
  }

  async create(userId: string, dto: CreateTagDto): Promise<TagView> {
    return toView(await this.prisma.tag.create({ data: { userId, ...dto }, select: TAG_FIELDS }));
  }

  async update(userId: string, id: string, dto: UpdateTagDto): Promise<TagView> {
    return toView(
      await this.prisma.tag.update({ where: { id, userId }, data: dto, select: TAG_FIELDS }),
    );
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.tag.delete({ where: { id, userId } });
  }

  async assertOwned(userId: string, ids: string[]): Promise<void> {
    const owned = await this.prisma.tag.count({ where: { id: { in: ids }, userId } });
    if (owned !== new Set(ids).size) throw new NotFoundException('Tag introuvable.');
  }
}
