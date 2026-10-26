import { IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class WithdrawDto {
  @IsNotEmpty() @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  walletAddress: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  walletPassword: string;
}
