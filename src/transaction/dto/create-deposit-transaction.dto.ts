import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDepositTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  txid!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5_000_000)
  proofPaymentDocument!: string;
}
