import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { RiskLevel } from '../../copy-trading/dto/create-copy-trading.dto';

export enum CopyTradePurchaseStatus { ACTIVE = 'active', LIQUIDATED = 'liquidated' }

export class UpdateCopyTradePurchaseDto {
  @IsOptional() @IsString() traderName?: string;
  @IsOptional() @IsEnum(RiskLevel) riskLevel?: RiskLevel;
  @IsOptional() @IsString() @Matches(/^\d+\s+days?$/i) duration?: string;
  @IsOptional() @Type(() => Number) @IsNumber() leverage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) winrate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() pnl?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) purchases?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) totalAssets?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amountInvested?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Date) @IsDate() expiredAt?: Date;
  @IsOptional() @IsEnum(CopyTradePurchaseStatus) status?: CopyTradePurchaseStatus;
  @IsOptional() @Type(() => Date) @IsDate() liquidatedAt?: Date;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) liquidationAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) liquidationFee?: number;
}
