import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import * as Joi from 'joi';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { CopyTradingModule } from './copy-trading/copy-trading.module.js';
import { TransactionModule } from './transaction/transaction.module.js';
import { CrewModule } from './crew/crew.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(5000),
        MONGO_DB: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_RESET_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().optional(),
        JWT_ACCESS_EXPIRATION: Joi.string().optional(),
        JWT_REFRESH_EXPIRATION: Joi.string().optional(),
        EMAIL_HOST: Joi.string().optional(),
        EMAIL_PORT: Joi.number().port().optional(),
        EMAIL_USER: Joi.string().email().required(),
        EMAIL_PASS: Joi.string().required(),
        ADMIN_EMAIL: Joi.string().email().optional(),
        OWNER_EMAIL: Joi.string().email().optional(),
        PASSWORD_RESET_URL: Joi.string().uri().optional(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_DB'),
      }),
    }),
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
    UserModule,
    AuthModule,
    AdminModule,
    CopyTradingModule,
    CrewModule,
    TransactionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
