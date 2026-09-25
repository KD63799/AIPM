import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Opts a route or controller out of the global JWT guard. */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC, true);
