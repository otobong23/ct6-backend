import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EarnerDocument = Earner & Document;

@Schema({ timestamps: true })
export class Earner {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'CopyTradePurchase', required: true, unique: true }) copyTradePurchaseId!: Types.ObjectId;
  @Prop({ type: Number, required: true, min: 0 }) dailyAveragePercentage!: number;
  @Prop({ type: Number, required: true, min: 0 }) amountInvested!: number;
  @Prop({ type: Number, required: true, min: 0 }) nextEarningAmount!: number;
  @Prop({ type: Date, required: true, index: true }) nextEarningDate!: Date;
  @Prop({ type: Date, required: true, index: true }) expiresAt!: Date;
  @Prop({ type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true }) status!: 'active' | 'completed' | 'cancelled';
  @Prop({ type: Date }) lastEarningDate?: Date;
}

export const EarnerSchema = SchemaFactory.createForClass(Earner);
EarnerSchema.index({ status: 1, nextEarningDate: 1 });
