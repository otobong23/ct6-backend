import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class BindWalletAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  walletAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  walletPassword!: string;
}
