import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export enum RiskLevel { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }

export class CreateCopyTradingDto {
  @IsString() traderName!: string;
  @IsEnum(RiskLevel) riskLevel!: RiskLevel;
  @Type(() => Number) @IsNumber() leverage!: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) winrate!: number;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsArray() @Type(() => Number) @IsNumber({}, { each: true }) last_10_trades?: number[];
  @Matches(/^\d+\s+days?$/i, { message: 'duration must be in the format "30 days"' }) duration!: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) dailyAveragePercentage!: number;
  @Type(() => Number) @IsNumber() @Min(0) purchases!: number;
  @Type(() => Number) @IsNumber() @Min(0) totalAssets!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) minInvestment!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) maxInvestment!: number;
}
