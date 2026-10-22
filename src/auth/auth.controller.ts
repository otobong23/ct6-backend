 import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerificationDto, ForgotPasswordDto, LoginDto, ProviderSignInDto, RefreshTokenDto, ResetPasswordDto, SignUpDto, VerifyEmailCodeDto } from './dto/auth.dto';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorator/current.logged.user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignUpDto) { return this.authService.signup(dto); }

  @Post('send-verification-code')
  sendVerificationCode(@Body() dto: EmailVerificationDto) { return this.authService.sendVerificationCode(dto); }

  @Post('resend-verification-code')
  resendVerificationCode(@Body() dto: EmailVerificationDto) { return this.authService.resendVerificationCode(dto); }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailCodeDto) { return this.authService.verifyEmailCode(dto); }

  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('google')
  googleSignIn(@Body() dto: ProviderSignInDto) { return this.authService.googleSignIn(dto); }

  @Post('apple')
  appleSignIn(@Body() dto: ProviderSignInDto) { return this.authService.appleSignIn(dto); }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) { return this.authService.refresh(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: { sub: string }) { return this.authService.logout(user.sub); }
}
