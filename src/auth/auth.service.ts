import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { OAuth2Client } from 'google-auth-library';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User, UserDocument } from '../common/schemas/user/user.schema.js';
import { comparedHashed, HashData } from '../common/hashed/hashed.data.js';
import { AuthProvider } from '../user/enum/auth-provider.enum.js';
import { EmailVerificationDto, ForgotPasswordDto, LoginDto, ProviderSignInDto, RefreshTokenDto, ResetPasswordDto, SignUpDto, VerifyEmailCodeDto } from './dto/auth.dto.js';
import { CrewService } from '../crew/crew.service.js';

type AppleClaims = { iss?: string; aud?: string | string[]; exp?: number; sub?: string; email?: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private crewService: CrewService,
    private readonly googleClient: OAuth2Client,
    private readonly configService: ConfigService,
  ) { }

  private hash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
  private safeUser(user: UserDocument) { return { id: String(user._id), userID: user.userID, email: user.email, firstName: user.firstName, lastName: user.lastName, authType: user.authType }; }

  private async issueTokens(user: UserDocument) {
    const payload = { sub: String(user._id), userID: user.userID, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as any }),
      this.jwtService.signAsync(payload, { secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.getOrThrow<string>('JWT_SECRET'), expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d') as any }),
    ]);
    user.refreshToken = this.hash(refreshToken);
    await user.save();
    return { accessToken, refreshToken };
  }

  private async authResponse(user: UserDocument, message: string) { return { success: true, message, ...(await this.issueTokens(user)), user: this.safeUser(user) }; }

  private async handleReferrer(referral_code?: string) {
    if (!referral_code) return undefined;

    const referrer = await this.userModel.findOne({ referral_code });
    if (!referrer) throw new BadRequestException('Invalid referral code');

    await this.userModel.findByIdAndUpdate(referrer._id, {
      $inc: { referral_count: 1 },
    });

    return referrer.referral_code;
  }

  private async createCrewIfNotExists(user: UserDocument) {
    const existingCrew = await this.crewService.getUserCrew(user.email);
    if (!existingCrew) await this.crewService.createCrew(user);
  }

  async signup(dto: SignUpDto) {
    if (await this.userModel.exists({ email: dto.email })) throw new ConflictException('An account already exists for this email');
    const referredBy = await this.handleReferrer(dto.referral_code);
    const user = await this.userModel.create({ email: dto.email, password: await HashData(dto.password), firstName: dto.firstName || '', lastName: dto.lastName || '', authType: AuthProvider.LOCAL });
    await this.crewService.createCrew(user);
    if (dto.referral_code) {
      await this.crewService.updateCrew(dto.referral_code, user);
    }
    const response = await this.authResponse(user, 'Account created successfully');
    await this.sendVerificationCode({ email: user.email });
    return response;
  }

  async sendVerificationCode(dto: EmailVerificationDto) {
    const user = await this.userModel.findOne({ email: dto.email }).select('+emailVerificationCodeHash +emailVerificationExpiresAt');
    if (!user) throw new BadRequestException('No account exists for this email');
    if (user.isVerified) return { success: true, message: 'Email is already verified' };

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    user.emailVerificationCodeHash = this.hash(code);
    user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailHost = this.configService.get<string>('EMAIL_HOST');
    if (!emailHost) {
      if (this.configService.get<string>('NODE_ENV') !== 'production') return { success: true, message: 'Verification code generated', ...(this.configService.get<string>('NODE_ENV') === 'test' ? { code } : {}) };
      throw new InternalServerErrorException('Email delivery is not configured');
    }
    try {
      const port = this.configService.get<number>('EMAIL_PORT', 587);
      await nodemailer.createTransport({ host: emailHost, port, secure: port === 465, auth: { user: this.configService.getOrThrow<string>('EMAIL_USER'), pass: this.configService.getOrThrow<string>('EMAIL_PASS') } }).sendMail({
        from: this.configService.getOrThrow<string>('EMAIL_USER'), to: user.email,
        subject: 'Verify your email address', text: `Your verification code is ${code}. It expires in 10 minutes.`,
      });
    } catch {
      user.emailVerificationCodeHash = undefined; user.emailVerificationExpiresAt = undefined; await user.save();
      throw new InternalServerErrorException('Unable to send verification email');
    }
    return { success: true, message: 'Verification code sent' };
  }

  async resendVerificationCode(dto: EmailVerificationDto) {
    return this.sendVerificationCode(dto);
  }

  async verifyEmailCode(dto: VerifyEmailCodeDto) {
    const user = await this.userModel.findOne({ email: dto.email }).select('+emailVerificationCodeHash +emailVerificationExpiresAt');
    if (!user) throw new BadRequestException('No account exists for this email');
    if (user.isVerified) return { success: true, message: 'Email is already verified' };
    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt <= new Date() || user.emailVerificationCodeHash !== this.hash(dto.code)) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    user.isVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return { success: true, message: 'Email verified successfully' };
  }

  async login(dto: LoginDto) {
    return this.loginWithRole(dto, false);
  }

  async loginAdmin(dto: LoginDto) {
    return this.loginWithRole(dto, true);
  }

  private async loginWithRole(dto: LoginDto, requireAdmin: boolean) {
    const user = await this.userModel.findOne({ email: dto.email }).select('+password +isAdmin');
    if (!user || !user.password || !(await comparedHashed(dto.password, user.password))) throw new UnauthorizedException('Invalid email or password');
    if (user.isSuspended) throw new UnauthorizedException('This account has been suspended');
    if (requireAdmin && !user.isAdmin) throw new UnauthorizedException('Invalid administrator credentials');
    if (!requireAdmin) await this.createCrewIfNotExists(user);
    return this.authResponse(user, 'Login successful');
  }

  async googleSignIn(dto: ProviderSignInDto) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) throw new InternalServerErrorException('Google sign-in is not configured');
    let payload: { sub?: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string } | undefined;
    try { payload = (await this.googleClient.verifyIdToken({ idToken: dto.idToken, audience: googleClientId })).getPayload(); }
    catch { throw new UnauthorizedException('Invalid Google ID token'); }
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new UnauthorizedException('Google account email is not verified');
    const referredBy = await this.handleReferrer(dto.referral_code);
    return this.upsertProviderUser(AuthProvider.GOOGLE, payload.sub, payload.email, dto.firstName || payload.given_name, dto.lastName || payload.family_name, dto.referral_code);
  }

  async appleSignIn(dto: ProviderSignInDto) {
    const claims = await this.verifyAppleToken(dto.idToken);
    if (!claims.sub) throw new UnauthorizedException('Invalid Apple ID token');
    const existing = await this.userModel.findOne({ authId: claims.sub, authType: AuthProvider.APPLE });
    if (existing) return this.authResponse(existing, 'Apple sign-in successful');
    if (!claims.email) throw new BadRequestException('Apple only provides an email on the first sign-in; use the original Apple ID token');
    const referredBy = await this.handleReferrer(dto.referral_code);
    return this.upsertProviderUser(AuthProvider.APPLE, claims.sub, claims.email, dto.firstName, dto.lastName, dto.referral_code);
  }

  private async upsertProviderUser(provider: AuthProvider, authId: string, email: string, firstName?: string, lastName?: string, referral_code?: string) {
    let user = await this.userModel.findOne({ authId, authType: provider });
    if (!user) {
      user = await this.userModel.findOne({ email: email.toLowerCase() });
      if (user && user.authId && user.authId !== authId) throw new ConflictException('This email is already linked to another sign-in provider');
      if (user) { user.authId = authId; user.authType = provider; user.firstName ||= firstName || ''; user.lastName ||= lastName || ''; await user.save(); }
      else user = await this.userModel.create({ email: email.toLowerCase(), authId, authType: provider, firstName: firstName || '', lastName: lastName || '', isVerified: true });
      await this.crewService.createCrew(user);
      if (referral_code) {
        await this.crewService.updateCrew(referral_code, user);
      }
    }
    if (user.isSuspended) throw new UnauthorizedException('This account has been suspended');
    return this.authResponse(user, `${provider} sign-in successful`);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const response: Record<string, unknown> = { success: true, message: 'If an account exists, password-reset instructions have been sent.' };
    const user = await this.userModel.findOne({ email: dto.email }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) return response;
    const jti = crypto.randomUUID();
    const token = await this.jwtService.signAsync({ sub: String(user._id), email: user.email, purpose: 'password-reset', jti }, { secret: this.configService.getOrThrow<string>('JWT_RESET_SECRET'), expiresIn: '1h' });
    user.passwordResetTokenHash = this.hash(jti); user.passwordResetExpiresAt = new Date(Date.now() + 3600000); await user.save();
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    if (emailHost) {
      try {
        const port = this.configService.get<number>('EMAIL_PORT', 587);
        const resetUrl = `${this.configService.get<string>('PASSWORD_RESET_URL', 'http://localhost:3000/reset-password')}?token=${encodeURIComponent(token)}`;
        await nodemailer.createTransport({ host: emailHost, port, secure: port === 465, auth: { user: this.configService.getOrThrow<string>('EMAIL_USER'), pass: this.configService.getOrThrow<string>('EMAIL_PASS') } }).sendMail({
          from: this.configService.getOrThrow<string>('EMAIL_USER'),
          to: user.email,
          subject: 'Reset your password',
          text: `Use this link within one hour to reset your password: ${resetUrl}`,
        });
      } catch {
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();
        throw new InternalServerErrorException('Unable to send password-reset email');
      }
    }
    // A local/test caller can use this token without an SMTP server.
    if (this.configService.get<string>('NODE_ENV') !== 'production') response.resetToken = token;
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; purpose: string; jti: string };
    try { payload = await this.jwtService.verifyAsync(dto.token, { secret: this.configService.getOrThrow<string>('JWT_RESET_SECRET') }); } catch { throw new UnauthorizedException('Invalid or expired reset token'); }
    if (payload.purpose !== 'password-reset' || !payload.jti) throw new UnauthorizedException('Invalid reset token');
    const user = await this.userModel.findById(payload.sub).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date() || user.passwordResetTokenHash !== this.hash(payload.jti)) throw new UnauthorizedException('Invalid or expired reset token');
    user.password = await HashData(dto.newPassword); user.passwordResetTokenHash = undefined; user.passwordResetExpiresAt = undefined; user.refreshToken = undefined; await user.save();
    return this.authResponse(user, 'Password reset successful');
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: string };
    try { payload = await this.jwtService.verifyAsync(dto.refreshToken, { secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.getOrThrow<string>('JWT_SECRET') }); } catch { throw new UnauthorizedException('Invalid or expired refresh token'); }
    const user = await this.userModel.findById(payload.sub).select('+refreshToken');
    if (!user || user.refreshToken !== this.hash(dto.refreshToken)) throw new UnauthorizedException('Refresh token is no longer valid');
    return this.authResponse(user, 'Token refreshed');
  }

  async logout(userId: string) { await this.userModel.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } }); return { success: true, message: 'Logged out successfully' }; }

  private async verifyAppleToken(token: string): Promise<AppleClaims> {
    const [encodedHeader, encodedClaims, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedClaims || !encodedSignature) throw new UnauthorizedException('Invalid Apple ID token');
    let header: { kid?: string; alg?: string }; let claims: AppleClaims;
    try { header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString()); claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString()); } catch { throw new UnauthorizedException('Invalid Apple ID token'); }
    if (header.alg !== 'RS256' || !header.kid || claims.iss !== 'https://appleid.apple.com' || !claims.exp || claims.exp * 1000 <= Date.now()) throw new UnauthorizedException('Invalid Apple ID token');
    const audience = this.configService.get<string>('APPLE_CLIENT_ID');
    if (!audience || !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(audience)) throw new UnauthorizedException('Apple token audience is invalid');
    let keys: { keys: JsonWebKey[] };
    try { keys = await (await fetch('https://appleid.apple.com/auth/keys')).json() as { keys: JsonWebKey[] }; } catch { throw new InternalServerErrorException('Unable to verify Apple ID token'); }
    const key = keys.keys.find((candidate: any) => candidate.kid === header.kid);
    if (!key || !crypto.verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedClaims}`), crypto.createPublicKey({ key: key as crypto.JsonWebKey, format: 'jwk' }), Buffer.from(encodedSignature, 'base64url'))) throw new UnauthorizedException('Invalid Apple ID token');
    return claims;
  }
}

