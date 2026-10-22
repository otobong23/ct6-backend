import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { ConfigService } from '@nestjs/config';


@Injectable()
export default class ResetPasswordStrategy extends PassportStrategy(
  Strategy,
  'jwt-reset-password'
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_RESET_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    const { email, purpose } = payload;

    if (!email || purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token');
    }

    return { email };
  }
}
