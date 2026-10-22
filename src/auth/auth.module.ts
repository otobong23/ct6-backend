import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { OAuth2Client } from 'google-auth-library';
import { JwtStrategy } from '../common/strategies/jwt.strategy.js';
import ResetPasswordStrategy from '../common/strategies/ResetPasswordStrategy.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../common/schemas/user/user.schema.js';
import { ConfigService } from '@nestjs/config';
import { CrewModule } from '../crew/crew.module.js';

@Module({
  imports: [
    CrewModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ResetPasswordStrategy,
    {
      provide: OAuth2Client,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new OAuth2Client({
          clientId: configService.get<string>('GOOGLE_CLIENT_ID'),
          clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
        });
      },
    }
  ],
  exports: [AuthService],
})
export class AuthModule { }
