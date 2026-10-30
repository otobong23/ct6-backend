import { IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

export class WithdrawDto {
  @IsNotEmpty() @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  walletPassword: string;
}
