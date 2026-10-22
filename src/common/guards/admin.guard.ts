import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user as { sub?: string } | undefined;
    if (!user?.sub) throw new UnauthorizedException();
    const account = await this.userModel.findById(user.sub).select('+isAdmin');
    if (!account?.isAdmin) throw new ForbiddenException('Administrator access is required');
    return true;
  }
}
