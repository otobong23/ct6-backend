import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user/user.schema';
import { Transaction, TransactionDocument } from '../transaction/schemas/transaction.schema';
import { TransactionStatus } from '../transaction/enum/transaction-status.enum';
import { TransactionType } from '../transaction/enum/transaction-type.enum';
import { BuyCopyTradingDto } from './dto/buy-copy-trading.dto';
import { LiquidateCopyTradingDto } from './dto/liquidate-copy-trading.dto';
import { CreateCopyTradingDto } from './dto/create-copy-trading.dto';
import { UpdateCopyTradingDto } from './dto/update-copy-trading.dto';
import { CopyTradePurchase, CopyTradePurchaseDocument } from './schemas/copy-trade-purchase.schema';
import { CopyTrading, CopyTradingDocument } from './schemas/copy-trading.schema';

@Injectable()
export class CopyTradingService {
  constructor(
    @InjectModel(CopyTrading.name) private readonly copyTradingModel: Model<CopyTradingDocument>,
    @InjectModel(CopyTradePurchase.name) private readonly purchaseModel: Model<CopyTradePurchaseDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  findAll() { return this.copyTradingModel.find().sort({ createdAt: -1 }); }

  async findOne(id: string) {
    const trade = await this.copyTradingModel.findById(id);
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return trade;
  }

  create(dto: CreateCopyTradingDto) { return this.copyTradingModel.create(dto); }

  async update(id: string, dto: UpdateCopyTradingDto) {
    const trade = await this.copyTradingModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return trade;
  }

  async remove(id: string) {
    const trade = await this.copyTradingModel.findByIdAndDelete(id);
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return { message: 'Copy-trading plan deleted successfully' };
  }

  async buy(userId: string, tradeId: string) {
    const session = await this.connection.startSession();
    let result: { purchase: CopyTradePurchaseDocument; transaction: TransactionDocument } | undefined;
    try {
      await session.withTransaction(async () => {
        const trade = await this.copyTradingModel.findById(tradeId).session(session);
        if (!trade) throw new NotFoundException('Copy-trading plan not found');
        const days = Number.parseInt(trade.duration, 10);
        if (!Number.isFinite(days) || days < 1) throw new BadRequestException('Copy-trading plan has an invalid duration');
        const user = await this.userModel.findOneAndUpdate(
          { _id: new Types.ObjectId(userId), balance: { $gte: trade.price } },
          { $inc: { balance: -trade.price } },
          { new: true, session },
        );
        if (!user) throw new BadRequestException('Insufficient main balance to purchase this copy-trading plan');
        const expiredAt = new Date(); expiredAt.setUTCDate(expiredAt.getUTCDate() + days);
        const [purchase] = await this.purchaseModel.create([{ userId: user._id, copyTradingId: trade._id, traderName: trade.traderName, riskLevel: trade.riskLevel, duration: trade.duration, dailyAverageProfit: trade.dailyAverageProfit, leverage: trade.leverage, winrate: trade.winrate, pnl: 0, purchases: trade.purchases, totalAssets: trade.totalAssets, price: trade.price, amountInvested: 0, currency: trade.currency, expiredAt, status: 'active' }], { session });
        const [transaction] = await this.transactionModel.create([{ userId: user._id, email: user.email, type: TransactionType.COPY_TRADE, amount: trade.price, currency: trade.currency, reference: String(purchase._id), note: `Copy trade with ${trade.traderName} for ${trade.duration}`, status: TransactionStatus.COMPLETED }], { session });
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

        const user = await this.userModel.findOneAndUpdate(
          { _id: new Types.ObjectId(userId), balance: { $gte: dto.amountInvested } },
          { $inc: { balance: -dto.amountInvested } },
          { new: true, session },
        );
        if (!user) throw new BadRequestException('Insufficient main balance');

        purchase.amountInvested = Number((purchase.amountInvested + dto.amountInvested).toFixed(2));
        await purchase.save({ session });
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
        const user = await this.userModel.findByIdAndUpdate(userId, { $inc: { balance: payout } }, { new: true, session });
        if (!user) throw new NotFoundException('User not found');
        const [transaction] = await this.transactionModel.create([{ userId: user._id, email: user.email, type: TransactionType.COPY_TRADE_LIQUIDATION, amount: payout, currency: purchase.currency, reference: String(purchase._id), note: dto.note ?? `Liquidated copy trade with ${purchase.traderName}`, status: TransactionStatus.COMPLETED }], { session });
        result = { purchase, transaction, payout, fee: 0 };
      });
      return result!;
    } finally { await session.endSession(); }
  }
}
