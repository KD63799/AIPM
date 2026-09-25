import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export const HEX_COLOR = /^#[0-9a-f]{6}$/;
export const LowerCase = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  );

export class CreateTagDto {
  @Trim()
  @IsString()
  @Length(1, 40)
  name!: string;

  @LowerCase()
  @Matches(HEX_COLOR, { message: 'La couleur doit être au format #rrggbb.' })
  color!: string;
}
