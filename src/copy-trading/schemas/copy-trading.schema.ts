import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RiskLevel } from '../dto/create-copy-trading.dto';

@Schema({ timestamps: true })
export class CopyTrading {
  @Prop({ required: true, trim: true }) traderName!: string;
  @Prop({ type: String, enum: RiskLevel, required: true }) riskLevel!: RiskLevel;
  @Prop({ type: Number, required: true }) leverage!: number;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) winrate!: number;
  @Prop({ type: String, trim: true }) country?: string;
  @Prop({ type: [Number], default: [] }) last_10_trades!: number[];
  @Prop({ required: true }) duration!: string;
  @Prop({ type: Number, required: true, min: 0 }) purchases!: number;
  @Prop({ type: Number, min: 0, default: 5 }) totalAssets!: number;
  @Prop({ type: Number, required: true, min: 0.01 }) price!: number;
  @Prop({ type: Number, required: true }) dailyAverageProfit!: number;
  @Prop({ default: 'USD', uppercase: true, trim: true }) currency!: string;
}
export const CopyTradingSchema = SchemaFactory.createForClass(CopyTrading);
export interface CopyTradingDocument extends CopyTrading, Document {}
