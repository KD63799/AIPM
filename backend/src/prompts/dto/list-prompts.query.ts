import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export const PROMPT_SORTS = ['recent', 'used', 'lastUsed', 'title'] as const;
export type PromptSort = (typeof PROMPT_SORTS)[number];

export class ListPromptsQuery {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsIn(PROMPT_SORTS)
  sort?: PromptSort;
}
