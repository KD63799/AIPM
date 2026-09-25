import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../common/trim.decorator';
import { VariableDto } from './variable.dto';

export class CreatePromptDto {
  @Trim()
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 50_000)
  content!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  /** Defaults and descriptions; entries whose name is not in `content` are ignored. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableDto)
  variables?: VariableDto[];
}
