import { Body, Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DeleteAccountDto } from './dto/delete-account.dto';
import type { PublicUser } from './users.service';
import { UsersService } from './users.service';

@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() userId: string): Promise<PublicUser> {
    return this.users.getById(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() userId: string, @Body() dto: DeleteAccountDto): Promise<void> {
    return this.users.remove(userId, dto.password);
  }
}
