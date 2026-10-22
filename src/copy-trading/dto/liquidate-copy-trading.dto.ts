import { IsOptional, IsString, Length } from 'class-validator';

/** Optional audit note supplied when the owner liquidates a matured position. */
export class LiquidateCopyTradingDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}
