import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user/user.schema.js';
import { UpdateUserDTO } from './dto/update.user.dto.js';
import { WalletPasswordDto } from './dto/wallet-password.dto.js';
import { comparedHashed, HashData } from '../common/hashed/hashed.data.js';

/** Owns profile data only. Account creation, credentials and tokens belong to AuthService. */
@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findUserById(id: string) {
    const user = await this.userModel.findById(id).select('+walletPassword -password -refreshToken -accessToken -randomToken');
    if (!user) throw new NotFoundException('User not found');
    return { ...user.toObject(), walletPassword: Boolean(user.walletPassword) };
  }

  async updateProfile(id: string, updateData: UpdateUserDTO) {
    const user = await this.userModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createWalletPassword(id: string, dto: WalletPasswordDto) {
    const user = await this.userModel.findById(id).select('+walletPassword');
    if (!user) throw new NotFoundException('User not found');
    if (user.walletPassword) throw new ConflictException('A wallet password already exists. Use the change option.');
    user.walletPassword = await HashData(dto.newPassword);
    await user.save();
    return { success: true, message: 'Wallet password created successfully' };
  }

  async changeWalletPassword(id: string, dto: WalletPasswordDto) {
    const user = await this.userModel.findById(id).select('+walletPassword');
    if (!user) throw new NotFoundException('User not found');
    if (!user.walletPassword) throw new ConflictException('Create a wallet password before changing it.');
    if (!dto.currentPassword || !(await comparedHashed(dto.currentPassword, user.walletPassword))) {
      throw new UnauthorizedException('Current wallet password is incorrect');
    }
    user.walletPassword = await HashData(dto.newPassword);
    await user.save();
    return { success: true, message: 'Wallet password changed successfully' };
  }

  async deleteOwnAccount(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User deleted successfully' };
  }
}
