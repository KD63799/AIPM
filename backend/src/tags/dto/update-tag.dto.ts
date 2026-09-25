import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../common/trim.decorator';
import { HEX_COLOR, LowerCase } from './create-tag.dto';

export class UpdateTagDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 40)
  name?: string;

  @IsOptional()
  @LowerCase()
  @Matches(HEX_COLOR, { message: 'La couleur doit être au format #rrggbb.' })
  color?: string;
}
