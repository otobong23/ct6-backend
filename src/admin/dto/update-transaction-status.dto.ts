import { IsEnum } from 'class-validator';
import { TransactionStatus } from '../../transaction/enum/transaction-status.enum';

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  status!: TransactionStatus;
}
