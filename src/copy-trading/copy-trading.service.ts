import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user/user.schema.js';
import { Transaction, TransactionDocument } from '../transaction/schemas/transaction.schema.js';
import { TransactionStatus } from '../transaction/enum/transaction-status.enum.js';
import { TransactionType } from '../transaction/enum/transaction-type.enum.js';
import { BuyCopyTradingDto } from './dto/buy-copy-trading.dto.js';
import { LiquidateCopyTradingDto } from './dto/liquidate-copy-trading.dto.js';
import { CreateCopyTradingDto } from './dto/create-copy-trading.dto.js';
import { UpdateCopyTradingDto } from './dto/update-copy-trading.dto.js';
import { CopyTradePurchase, CopyTradePurchaseDocument } from './schemas/copy-trade-purchase.schema.js';
import { CopyTrading, CopyTradingDocument } from './schemas/copy-trading.schema.js';
import { Earner, EarnerDocument } from '../transaction/schemas/earner.schema.js';

@Injectable()
export class CopyTradingService {
  constructor(
    @InjectModel(CopyTrading.name) private readonly copyTradingModel: Model<CopyTradingDocument>,
    @InjectModel(CopyTradePurchase.name) private readonly purchaseModel: Model<CopyTradePurchaseDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Earner.name) private readonly earnerModel: Model<EarnerDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  findAll() { return this.copyTradingModel.find().sort({ createdAt: -1 }); }

  async findOne(id: string) {
    const trade = await this.copyTradingModel.findById(id);
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return trade;
  }

  create(dto: CreateCopyTradingDto) {
    if (dto.maxInvestment < dto.minInvestment) throw new BadRequestException('maxInvestment must be greater than or equal to minInvestment');
    return this.copyTradingModel.create(dto);
  }

  async update(id: string, dto: UpdateCopyTradingDto) {
    if (dto.maxInvestment !== undefined || dto.minInvestment !== undefined) {
      const current = await this.copyTradingModel.findById(id).select('minInvestment maxInvestment');
      if (!current) throw new NotFoundException('Copy-trading plan not found');
      if ((dto.maxInvestment ?? current.maxInvestment) < (dto.minInvestment ?? current.minInvestment)) throw new BadRequestException('maxInvestment must be greater than or equal to minInvestment');
    }
    const trade = await this.copyTradingModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return trade;
  }

  async remove(id: string) {
    const trade = await this.copyTradingModel.findByIdAndDelete(id);
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return { message: 'Copy-trading plan deleted successfully' };
  }

  async buy(userId: string, tradeId: string, dto: BuyCopyTradingDto) {
    const session = await this.connection.startSession();
    let result: { purchase: CopyTradePurchaseDocument; transaction: TransactionDocument } | undefined;
    try {
      await session.withTransaction(async () => {
        const trade = await this.copyTradingModel.findById(tradeId).session(session);
        if (!trade) throw new NotFoundException('Copy-trading plan not found');
        if (trade.locked) throw new BadRequestException(trade.lockedNote || 'This copy-trading plan is locked');
        const days = Number.parseInt(trade.duration, 10);
        if (!Number.isFinite(days) || days < 1) throw new BadRequestException('Copy-trading plan has an invalid duration');
        if (dto.amountInvested < trade.minInvestment || dto.amountInvested > trade.maxInvestment) throw new BadRequestException(`Investment must be between ${trade.minInvestment} and ${trade.maxInvestment}`);
        const user = await this.userModel.findOneAndUpdate(
          { _id: new Types.ObjectId(userId), balance: { $gte: dto.amountInvested } },
          { $inc: { balance: -dto.amountInvested } },
          { new: true, session },
        );
        if (!user) throw new BadRequestException('Insufficient main balance');
        const expiredAt = new Date(); expiredAt.setUTCDate(expiredAt.getUTCDate() + days);
        const [purchase] = await this.purchaseModel.create([{ userId: user._id, copyTradingId: trade._id, traderName: trade.traderName, riskLevel: trade.riskLevel, duration: trade.duration, dailyAveragePercentage: trade.dailyAveragePercentage, leverage: trade.leverage, winrate: trade.winrate, pnl: 0, purchases: trade.purchases, totalAssets: trade.totalAssets, minInvestment: trade.minInvestment, maxInvestment: trade.maxInvestment, amountInvested: dto.amountInvested, currency: trade.currency, expiredAt, status: 'active' }], { session });
        const nextEarningDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.earnerModel.create([{ userId: user._id, copyTradePurchaseId: purchase._id, dailyAveragePercentage: trade.dailyAveragePercentage, amountInvested: dto.amountInvested, nextEarningAmount: Number((dto.amountInvested * trade.dailyAveragePercentage / 100).toFixed(2)), nextEarningDate, expiresAt: expiredAt, status: 'active' }], { session });
        const [transaction] = await this.transactionModel.create([{ userId: user._id, email: user.email, type: TransactionType.COPY_TRADE, amount: dto.amountInvested, currency: trade.currency, reference: String(purchase._id), note: `Copy trade with ${trade.traderName} for ${trade.duration}`, status: TransactionStatus.COMPLETED }], { session });
        result = { purchase, transaction };
      });
      return result!;
    } finally { await session.endSession(); }
  }

  async getMyPurchases(userId: string) {
    return this.purchaseModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).populate('copyTradingId').lean();
  }

  async addFunds(userId: string, purchaseId: string, dto: BuyCopyTradingDto) {
    const session = await this.connection.startSession();
    let result: { purchase: CopyTradePurchaseDocument; transaction: TransactionDocument } | undefined;
    try {
      await session.withTransaction(async () => {
        const purchase = await this.purchaseModel.findOne({
          _id: new Types.ObjectId(purchaseId),
          userId: new Types.ObjectId(userId),
        }).session(session);
        if (!purchase) throw new NotFoundException('Copy-trade purchase not found');
        if (purchase.status !== 'active' || purchase.liquidatedAt) {
          throw new BadRequestException('Funds can only be added to an active copy-trade purchase');
        }
        const newAmountInvested = Number((purchase.amountInvested + dto.amountInvested).toFixed(2));
        if (newAmountInvested > purchase.maxInvestment) throw new BadRequestException(`Total investment cannot exceed ${purchase.maxInvestment}`);

        const user = await this.userModel.findOneAndUpdate(
          { _id: new Types.ObjectId(userId), balance: { $gte: dto.amountInvested } },
          { $inc: { balance: -dto.amountInvested } },
          { new: true, session },
        );
        if (!user) throw new BadRequestException('Insufficient main balance');

        purchase.amountInvested = newAmountInvested;
        await purchase.save({ session });
        const earningAmount = Number((newAmountInvested * purchase.dailyAveragePercentage / 100).toFixed(2));
        await this.earnerModel.updateOne({ copyTradePurchaseId: purchase._id, status: 'active' }, { $set: { amountInvested: newAmountInvested, nextEarningAmount: earningAmount } }, { session });
        const [transaction] = await this.transactionModel.create([{
          userId: user._id, email: user.email, type: TransactionType.COPY_TRADE_ADD_FUNDS,
          amount: dto.amountInvested, currency: purchase.currency, reference: String(purchase._id),
          note: `Added funds to copy trade with ${purchase.traderName}`, status: TransactionStatus.COMPLETED,
        }], { session });
        result = { purchase, transaction };
      });
      return result!;
    } finally { await session.endSession(); }
  }

  async liquidate(userId: string, purchaseId: string, dto: LiquidateCopyTradingDto) {
    const session = await this.connection.startSession();
    let result: { purchase: CopyTradePurchaseDocument; transaction: TransactionDocument; payout: number; fee: number } | undefined;
    try {
      await session.withTransaction(async () => {
        const purchase = await this.purchaseModel.findOne({ _id: new Types.ObjectId(purchaseId), userId: new Types.ObjectId(userId) }).session(session);
        if (!purchase) throw new NotFoundException('Copy-trade purchase not found');
        if (purchase.status === 'liquidated' || purchase.liquidatedAt) throw new BadRequestException('This copy-trade purchase has already been liquidated');
        // if (purchase.expiredAt > new Date()) throw new BadRequestException('This copy trade can only be liquidated after its duration has ended');
        // The PNL is maintained by the trading process and is the current value to liquidate.
        const payout = Number(purchase.pnl.toFixed(8));
        if (payout <= 0) throw new BadRequestException('This copy trade has an invalid liquidation value');
        purchase.status = 'liquidated';
        purchase.liquidatedAt = new Date();
        purchase.liquidationAmount = payout;
        purchase.liquidationFee = 0;
        await purchase.save({ session });
        await this.earnerModel.updateOne({ copyTradePurchaseId: purchase._id, status: 'active' }, { $set: { status: 'cancelled' } }, { session });
        const user = await this.userModel.findByIdAndUpdate(userId, { $inc: { balance: payout } }, { new: true, session });
        if (!user) throw new NotFoundException('User not found');
        const [transaction] = await this.transactionModel.create([{ userId: user._id, email: user.email, type: TransactionType.COPY_TRADE_LIQUIDATION, amount: payout, currency: purchase.currency, reference: String(purchase._id), note: dto.note ?? `Liquidated copy trade with ${purchase.traderName}`, status: TransactionStatus.COMPLETED }], { session });
        result = { purchase, transaction, payout, fee: 0 };
      });
      return result!;
    } finally { await session.endSession(); }
  }
}
