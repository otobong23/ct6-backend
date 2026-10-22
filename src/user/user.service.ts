import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { UpdateUserDTO } from './dto/update.user.dto';

/** Owns profile data only. Account creation, credentials and tokens belong to AuthService. */
@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findUserById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, updateData: UpdateUserDTO) {
    const user = await this.userModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deleteOwnAccount(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User deleted successfully' };
  }
}
