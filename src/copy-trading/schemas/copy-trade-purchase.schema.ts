import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RiskLevel } from '../dto/create-copy-trading.dto.js';

@Schema({ timestamps: true })
export class CopyTradePurchase {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'CopyTrading', required: true }) copyTradingId!: Types.ObjectId;
  @Prop({ required: true }) traderName!: string;
  @Prop({ type: String, enum: RiskLevel, required: true }) riskLevel!: RiskLevel;
  @Prop({ required: true }) duration!: string;
  @Prop({ type: Number, required: true }) dailyAverageProfit!: number;
  @Prop({ type: Number, required: true }) leverage!: number;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) winrate!: number;
  @Prop({ type: Number, default: 0 }) pnl!: number;
  @Prop({ type: Number, required: true, min: 0 }) purchases!: number;
  @Prop({ type: Number, required: true, min: 0 }) totalAssets!: number;
  @Prop({ type: Number, required: true, min: 0.01 }) price!: number;
  @Prop({ type: Number, required: true, min: 0.01 }) amountInvested!: number;
  @Prop({ required: true }) currency!: string;
  @Prop({ type: Date, required: true, index: true }) expiredAt!: Date;
  @Prop({ type: String, enum: ['active', 'liquidated', 'expired'], default: 'active', index: true }) status!: 'active' | 'liquidated' | 'expired';
  @Prop({ type: Date }) liquidatedAt?: Date;
  @Prop({ type: Number, min: 0 }) liquidationAmount?: number;
  @Prop({ type: Number, min: 0 }) liquidationFee?: number;
}
export const CopyTradePurchaseSchema = SchemaFactory.createForClass(CopyTradePurchase);
CopyTradePurchaseSchema.index({ userId: 1, createdAt: -1 });
CopyTradePurchaseSchema.pre(['find', 'findOne'], async function () {
  const { userId } = this.getFilter();
  if (!userId) return;

  await this.model.updateMany(
    { userId, status: 'active', expiredAt: { $lte: new Date() } },
    { $set: { status: 'expired' } },
  );
});
export interface CopyTradePurchaseDocument extends CopyTradePurchase, Document { }
