import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VariableDto } from '../../prompts/dto/variable.dto';
import { HEX_COLOR } from '../../tags/dto/create-tag.dto';

export const LIBRARY_FORMAT = 'ai-prompt-manager';

export class LibraryFolderDto {
  /** Names from the root down to the folder itself. */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  path!: string[];
}

export class LibraryTagDto {
  @IsString()
  @Length(1, 40)
  name!: string;

  @Matches(HEX_COLOR)
  color!: string;
}

export class LibraryPromptDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 50_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  folder?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableDto)
  variables?: VariableDto[];
}

/** Portable library: folders by path and tags by name, so it imports into any account. */
export class LibraryDto {
  @Equals(LIBRARY_FORMAT)
  format!: typeof LIBRARY_FORMAT;

  @Equals(1)
  version!: 1;

  @IsOptional()
  @IsDateString()
  exportedAt?: string;

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => LibraryFolderDto)
  folders!: LibraryFolderDto[];

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => LibraryTagDto)
  tags!: LibraryTagDto[];

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => LibraryPromptDto)
  prompts!: LibraryPromptDto[];
}
