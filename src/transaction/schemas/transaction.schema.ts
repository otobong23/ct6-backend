import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { TransactionStatus } from '../enum/transaction-status.enum';
import { TransactionType } from '../enum/transaction-type.enum';

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: String, required: true, unique: true, default: () => nanoid(12) })
  transactionID!: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, enum: TransactionType, required: true })
  type!: TransactionType;

  @Prop({ type: String, enum: TransactionStatus, default: TransactionStatus.PENDING, index: true })
  status!: TransactionStatus;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount!: number;

  @Prop({ type: String, required: true, default: 'USD', uppercase: true, trim: true })
  currency!: string;

  @Prop({ type: String, trim: true })
  reference?: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  note?: string;

  /** Serialized proof image/document supplied by the user (JSON text). */
  @Prop({ type: String })
  proofPaymentDocument?: string;

  @Prop({ type: Types.ObjectId, ref: 'PaymentOrder', index: true })
  orderId?: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ userId: 1, createdAt: -1 });

export interface TransactionDocument extends Transaction, Document {}
