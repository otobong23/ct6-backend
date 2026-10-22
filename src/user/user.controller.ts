import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorator/current.logged.user';
import { Serialize } from 'src/common/interceptor/custom.interceptor';
import { UpdateUserDTO } from './dto/update.user.dto';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @Serialize(UserDto)
  @Get('profile')
  profile(@CurrentUser() user: { sub: string }) {
    return this.userService.findUserById(user.sub);
  }

  // @Serialize(UserDto)
  @Patch('profile')
  updateProfile(@Body() payload: UpdateUserDTO, @CurrentUser() user: { sub: string }) {
    return this.userService.updateProfile(user.sub, payload);
  }

  @Delete('account')
  deleteOwnAccount(@CurrentUser() user: { sub: string }) {
    return this.userService.deleteOwnAccount(user.sub);
  }
}
