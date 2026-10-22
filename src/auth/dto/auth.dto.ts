import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  referral_code?: string;
}

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ProviderSignInDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
  
  @IsOptional()
  @IsString()
  referral_code?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  email!: string;
}

export class EmailVerificationDto {
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  email!: string;
}

export class VerifyEmailCodeDto extends EmailVerificationDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
