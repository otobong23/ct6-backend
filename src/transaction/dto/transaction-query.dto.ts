import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { TransactionType } from '../enum/transaction-type.enum.js';

export class TransactionQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn([...Object.values(TransactionType), 'all'])
  type?: TransactionType | 'all';
}
