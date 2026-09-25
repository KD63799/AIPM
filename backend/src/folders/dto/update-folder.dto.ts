import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export class UpdateFolderDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 100)
  name?: string;

  /** `null` moves the folder to the root. */
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
