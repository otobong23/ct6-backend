import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum StockPurchaseStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum CopyTradePurchaseStatus {
  ACTIVE = 'active',
  LIQUIDATED = 'liquidated',
}

class AdminPurchaseQueryDto extends PaginationDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;
}

export class AdminUserParamsDto {
  @IsMongoId()
  userId!: string;
}

export class AdminStockPurchaseQueryDto extends AdminPurchaseQueryDto {
  @IsOptional()
  @IsEnum(StockPurchaseStatus)
  status?: StockPurchaseStatus;
}

export class AdminCopyTradePurchaseQueryDto extends AdminPurchaseQueryDto {
  @IsOptional()
  @IsEnum(CopyTradePurchaseStatus)
  status?: CopyTradePurchaseStatus;
}
