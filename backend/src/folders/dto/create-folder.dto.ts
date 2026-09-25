import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export class CreateFolderDto {
  @Trim()
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
