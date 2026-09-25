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

export class UpdatePromptDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50_000)
  content?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  /** `null` takes the prompt out of its folder. */
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  /** Replaces the whole tag set. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableDto)
  variables?: VariableDto[];
}
