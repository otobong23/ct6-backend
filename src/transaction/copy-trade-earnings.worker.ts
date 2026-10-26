import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user/user.schema.js';
import { CopyTradePurchase, CopyTradePurchaseDocument } from '../copy-trading/schemas/copy-trade-purchase.schema.js';
import { TransactionStatus } from './enum/transaction-status.enum.js';
import { TransactionType } from './enum/transaction-type.enum.js';
import { Earner, EarnerDocument } from './schemas/earner.schema.js';
import { Transaction, TransactionDocument } from './schemas/transaction.schema.js';

@Injectable()
export class CopyTradeEarningsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CopyTradeEarningsWorker.name);
  private earningTimer?: NodeJS.Timeout;

  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Earner.name) private readonly earnerModel: Model<EarnerDocument>,
    @InjectModel(CopyTradePurchase.name) private readonly purchaseModel: Model<CopyTradePurchaseDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  onModuleInit() {
    this.earningTimer = setInterval(() => void this.processDueEarnings().catch((error: unknown) => this.logger.error('Copy-trade earnings cycle failed', error)), 60_000);
    this.earningTimer.unref();
    void this.processDueEarnings().catch((error: unknown) => this.logger.error('Initial copy-trade earnings cycle failed', error));
  }

  onModuleDestroy() {
    if (this.earningTimer) clearInterval(this.earningTimer);
  }

  private async processDueEarnings() {
    const due = await this.earnerModel.find({ status: 'active', nextEarningDate: { $lte: new Date() } }).select('_id').lean();
    for (const item of due) await this.processEarner(item._id);
  }

  private async processEarner(earnerId: Types.ObjectId) {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const earner = await this.earnerModel.findOne({ _id: earnerId, status: 'active', nextEarningDate: { $lte: now } }).session(session);
        if (!earner) return;
        const purchase = await this.purchaseModel.findById(earner.copyTradePurchaseId).session(session);
        if (!purchase || purchase.status !== 'active' || earner.nextEarningDate > earner.expiresAt) {
          earner.status = purchase?.status === 'liquidated' ? 'cancelled' : 'completed';
          earner.nextEarningAmount = 0;
          await earner.save({ session });
          if (purchase?.status === 'active') {
            purchase.status = 'expired';
            await purchase.save({ session });
          }
          return;
        }

        const amount = Number((earner.amountInvested * earner.dailyAveragePercentage / 100).toFixed(2));
        const nextDate = new Date(earner.nextEarningDate.getTime() + 24 * 60 * 60 * 1000);
        earner.lastEarningDate = earner.nextEarningDate;
        earner.nextEarningDate = nextDate;
        earner.nextEarningAmount = amount;
        if (nextDate >= earner.expiresAt) {
          earner.status = 'completed';
          earner.nextEarningAmount = 0;
        }
        await earner.save({ session });
        if (amount <= 0) return;

        const user = await this.userModel.findByIdAndUpdate(earner.userId, { $inc: { balance: amount } }, { new: true, session });
        if (!user) throw new NotFoundException('User for copy-trade earning not found');
        await this.transactionModel.create([{
          userId: user._id,
          email: user.email,
          type: TransactionType.PROFIT,
          amount,
          currency: purchase.currency,
          reference: String(purchase._id),
          note: `Daily copy-trade earning for ${purchase.traderName}`,
          status: TransactionStatus.COMPLETED,
        }], { session });
      });
    } finally {
      await session.endSession();
    }
  }
}
