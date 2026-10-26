import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class WalletPasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
