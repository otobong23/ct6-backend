import { TransactionStatus } from '../../../transaction/enum/transaction-status.enum.js';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { nanoid } from 'nanoid';
import { AuthProvider } from '../../../user/enum/auth-provider.enum.js';


@Schema({ timestamps: true, id: true })
export class User {
  @Prop({ type: String, required: true, unique: true, default: () => nanoid(8) })
  userID!: string

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;
  
  @Prop({ type: Boolean, default: false })
  isVerified!: boolean;

  @Prop({ required: false })
  password?: string;

  @Prop({ type: String, required: true, default: '' })
  firstName!: string;

  @Prop({ type: String, required: true, default: '' })
  lastName!: string;

  @Prop({ type: String, unique: true, sparse: true })
  authId?: string;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  authType?: AuthProvider;

  @Prop({ type: Number, select: true, default: 0 })
  balance!: number;

  @Prop({ type: Number, select: true, default: 0 })
  totalWithdraw!: number;

  @Prop({ type: Number, select: true, default: 0 })
  totalDeposit!: number;

  @Prop({ type: Number, select: true, default: 0 })
  transactionCount!: number;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  profileImage?: string;

  @Prop({ type: String })
  walletAddress?: string;

  @Prop({ type: String, enum: TransactionStatus, default: TransactionStatus.PENDING, index: true })
  withdrawStatus!: TransactionStatus;

  @Prop({ type: String, select: false })
  walletPassword?: string

  @Prop({ type: Boolean, default: false })
  isSuspended!: boolean;

  /** Set by an operator directly; never accepted from public profile/auth DTOs. */
  @Prop({ type: Boolean, default: false, select: false })
  isAdmin!: boolean;
  

  
  @Prop({ type: String })
  referral_code!: string;

  @Prop({ type: String })
  referredBy?: string;

  @Prop({ type: Number, default: 0 })
  referral_count!: number;

  @Prop({ type: Number, default: 0 })
  referral_reward_count!: number;

  @Prop({ type: Number, default: 0 })
  referral_reward_level!: number;

  @Prop({ type: Boolean, default: false })
  referral_reward_count_recieved!: boolean;



  @Prop({ type: String })
  accessToken?: string;

  @Prop({ type: String })
  randomToken?: string;

  @Prop({ type: String })
  refreshToken?: string;

  @Prop({ type: String, select: false })
  passwordResetTokenHash?: string;

  @Prop({ type: Date, select: false })
  passwordResetExpiresAt?: Date;

  @Prop({ type: String, select: false })
  emailVerificationCodeHash?: string;

  @Prop({ type: Date, select: false })
  emailVerificationExpiresAt?: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);


UserSchema.pre('validate', function () {
  this.referral_code = this.userID;
});


UserSchema.statics.search = function (keyword: string) {
  const pattern = new RegExp(keyword, 'i'); // case-insensitive

  return this.find({
    $or: [
      { userID: pattern },
      { email: pattern },
      { firstName: pattern },
      { lastName: pattern },
      { phone: pattern },
    ],
  });
};


export interface UserDocument extends User, Document { }

export interface UserModel extends Model<UserDocument> {
  search(keyword: string): Promise<UserDocument[]>;
}
