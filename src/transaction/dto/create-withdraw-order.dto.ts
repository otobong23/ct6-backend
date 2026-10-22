import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class WithdrawDto {
  @IsNotEmpty() @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  walletAddress: string;
}