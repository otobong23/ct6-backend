import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
export class BuyCopyTradingDto { @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amountInvested!: number; }
