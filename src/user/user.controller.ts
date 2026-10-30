import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/strategies/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorator/current.logged.user.js';
import { Serialize } from '../common/interceptor/custom.interceptor.js';
import { UpdateUserDTO } from './dto/update.user.dto.js';
import { WalletPasswordDto } from './dto/wallet-password.dto.js';
import { UserDto } from './dto/user.dto.js';
import { UserService } from './user.service.js';
import { BindWalletAddressDto } from './dto/bind-wallet-address.dto.js';

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

  @Post('wallet-password')
  createWalletPassword(@Body() payload: WalletPasswordDto, @CurrentUser() user: { sub: string }) {
    return this.userService.createWalletPassword(user.sub, payload);
  }

  @Patch('wallet-password')
  changeWalletPassword(@Body() payload: WalletPasswordDto, @CurrentUser() user: { sub: string }) {
    return this.userService.changeWalletPassword(user.sub, payload);
  }

  @Patch('wallet-address')
  bindWalletAddress(@Body() payload: BindWalletAddressDto, @CurrentUser() user: { sub: string }) {
    return this.userService.bindWalletAddress(user.sub, payload);
  }

  @Delete('account')
  deleteOwnAccount(@CurrentUser() user: { sub: string }) {
    return this.userService.deleteOwnAccount(user.sub);
  }
}
