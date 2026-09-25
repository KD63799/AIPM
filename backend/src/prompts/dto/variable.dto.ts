import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VariableDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  defaultValue?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
