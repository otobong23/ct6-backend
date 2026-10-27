import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { User, UserDocument } from '../common/schemas/user/user.schema.js';
import type { UserModel } from '../common/schemas/user/user.schema.js';
import { Transaction, TransactionDocument } from '../transaction/schemas/transaction.schema.js';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto.js';
import { UpdateUserAdministrationDto } from './dto/update-user-administration.dto.js';
import { TransactionMailService } from '../transaction/transaction-mail.service.js';
import { TransactionType } from '../transaction/enum/transaction-type.enum.js';
import { CopyTradePurchase, CopyTradePurchaseDocument } from '../copy-trading/schemas/copy-trade-purchase.schema.js';
import { AdminCopyTradePurchaseQueryDto, AdminStockPurchaseQueryDto } from './dto/admin-purchase-query.dto.js';
import { CopyTrading, CopyTradingDocument } from '../copy-trading/schemas/copy-trading.schema.js';
import { UpdateCopyTradingDto } from '../copy-trading/dto/update-copy-trading.dto.js';
import { UpdateCopyTradePurchaseDto } from './dto/update-copy-trade-purchase.dto.js';
import { CrewService } from '../crew/crew.service.js';
import { CrewExtraService } from '../crew/crewExtra.service.js';
import { Crew, CrewDocument } from '../crew/schema/userCrew.schema.js';
import type { CrewModel } from '../crew/schema/userCrew.schema.js';
import { HashData } from '../common/hashed/hashed.data.js';
import { UserOrder, UserOrderDocument } from '@/transaction/schemas/userOrder.schema.js';
import { TransactionStatus } from '@/transaction/enum/transaction-status.enum.js';
import { sendMail } from '@/common/helpers/mailer.js';
import { ConfigService } from '@nestjs/config';



@Injectable()
export class AdminService {
  constructor(@InjectModel(User.name) private readonly userModel: UserModel, @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>, @InjectModel(CopyTradePurchase.name) private readonly copyTradePurchaseModel: Model<CopyTradePurchaseDocument>, @InjectModel(CopyTrading.name) private readonly copyTradingModel: Model<CopyTradingDocument>, private readonly transactionMailService: TransactionMailService, private crewService: CrewService, private crewExtraService: CrewExtraService, @InjectModel(Crew.name) private crewModel: CrewModel, @InjectModel(UserOrder.name) private readonly userOrderModel: Model<UserOrderDocument>, private configService: ConfigService) { }

  async findUsers(pagination: PaginationDto) {
    const page = pagination.page ?? 1; const limit = pagination.limit ?? 20;
    const [users, total] = await Promise.all([this.userModel.find().select('-password -refreshToken -accessToken -randomToken +walletPassword').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), this.userModel.countDocuments()]);
    return { data: users.map((user) => this.safeAdminUser(user)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUser(id: string, dto: UpdateUserAdministrationDto) {
    const updateData = { ...dto };
    if (updateData.walletPassword) updateData.walletPassword = await HashData(updateData.walletPassword);
    const user = await this.userModel.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true }).select('-password -refreshToken -accessToken -randomToken +walletPassword');
    if (!user) throw new NotFoundException('User not found');
    return this.safeAdminUser(user);
  }

  private safeAdminUser(user: UserDocument) {
    const data = user.toObject() as Record<string, unknown>;
    const hasWalletPassword = Boolean(data.walletPassword);
    delete data.walletPassword;
    delete data.password;
    delete data.refreshToken;
    delete data.accessToken;
    delete data.randomToken;
    return { ...data, walletPassword: hasWalletPassword };
  }

  async getTotalCrews() {
    return await this.crewModel.countDocuments()
  }

  async getAllCrews(limit = 50, page = 1) {
    limit = Math.max(1, Math.min(limit, 100))
    page = Math.max(1, page)
    const offset = (page - 1) * limit;
    const [crews, total] = await Promise.all([this.crewModel.find().skip(offset).limit(limit).exec(), this.crewModel.countDocuments()]);
    if (!total) throw new NotFoundException('No Crew Found');
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    return { crews, page, limit, total, totalPages,
    };
  }


  async getUserCrew(userID: string) {
    const user = await this.userModel.findOne({ userID });
    if (!user) throw new NotFoundException('User Not Found');
    return this.crewService.getCrew(userID)
  }

  async findTransactions(pagination: PaginationDto) {
    const page = pagination.page ?? 1; const limit = pagination.limit ?? 20;
    const [data, total] = await Promise.all([this.transactionModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), this.transactionModel.countDocuments()]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findCopyTradePurchases(query: AdminCopyTradePurchaseQueryDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 20;
    const filter = { ...(query.userId && { userId: new Types.ObjectId(query.userId) }), ...(query.status && { status: query.status }) };
    const [data, total] = await Promise.all([
      this.copyTradePurchaseModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'userID email firstName lastName').populate('copyTradingId', 'traderName currency').lean(),
      this.copyTradePurchaseModel.countDocuments(filter),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateCopyTrading(id: string, dto: UpdateCopyTradingDto) {
    if (dto.minInvestment !== undefined || dto.maxInvestment !== undefined) {
      const current = await this.copyTradingModel.findById(id).select('minInvestment maxInvestment');
      if (!current) throw new NotFoundException('Copy-trading plan not found');
      const minInvestment = dto.minInvestment ?? current.minInvestment;
      const maxInvestment = dto.maxInvestment ?? current.maxInvestment;
      if (maxInvestment < minInvestment) throw new BadRequestException('maxInvestment must be greater than or equal to minInvestment');
    }
    const trade = await this.copyTradingModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!trade) throw new NotFoundException('Copy-trading plan not found');
    return trade;
  }

  async updateCopyTradePurchase(id: string, dto: UpdateCopyTradePurchaseDto) {
    const purchase = await this.copyTradePurchaseModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!purchase) throw new NotFoundException('Copy-trade purchase not found');
    return purchase;
  }

  async updateTransactionStatus(id: string, dto: UpdateTransactionStatusDto) {
    const existing = await this.transactionModel.findById(id);
    if (!existing) throw new NotFoundException('Transaction not found');
    if (existing.orderId) throw new BadRequestException('Use the payment-order endpoint to update an order transaction');
    const transaction = await this.transactionModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status === 'pending' && [TransactionType.DEPOSIT, TransactionType.WITHDRAW].includes(transaction.type)) {
      await this.transactionMailService.sendPendingTransactionToAdmin(transaction);
    }
    if (transaction.status === 'completed') await this.transactionMailService.sendCompletedTransactionToUser(transaction);
    return transaction;
  }

  async ReviewTransaction(payload: USDT_PaymentPayload['data']) {

    const {
      txHash,
      from,
      to,
      amount,
    } = payload;
    const credited = Number(amount);

    console.log(
      `Received webhook: `, payload
    );

    // 1️⃣ Find order by invoiceId
    const order = await this.userOrderModel.findOne({
      displayAmount: credited,
      status: "pending",
      expiresAt: { $gt: new Date() }
    });

    if (!order) {
      console.warn(`Order not found for randomized amount: ${amount}`);
      return { ok: false };
    }

    const existingUser = await this.userModel.findOneAndUpdate({ email: order.email }, { $inc: { balance: order.expectedAmount } }, { new: true });
    if (!existingUser) {
      console.warn(`User not found for amount: ${credited} with email: ${order.email}`);
      return { ok: false };
    }

    //update user balance
    // await this.useUserBalance(order.email, order.expectedAmount, 'add');


    // 4️⃣ Referral bonus
    if (existingUser.oneTimeBonus) {
      await this.crewService.awardReferralBonus(
        existingUser.userID,
        order.expectedAmount,
        "first_deposit"
      );
      existingUser.oneTimeBonus = false;
      await existingUser.save();
    }

    // 5️⃣ Update admin stats
    // await this.updateAdminTotals("deposit", order.expectedAmount);

    let transaction;

    if (order.referenceID) {
      transaction = await this.transactionModel.findById(order.referenceID);
    }

    // 6️⃣ Create or update transaction
    if (!transaction) {

      transaction = await this.transactionModel.create({
        email: order.email,
        userId: existingUser._id,
        type: TransactionType.DEPOSIT,
        amount: order.expectedAmount,
        status: TransactionStatus.COMPLETED,
        orderId: order._id,
      });

      order.referenceID = transaction._id.toString();

    } else {
      transaction.status = "completed";

      await transaction.save();
    }

    // 7️⃣ Mark order completed
    order.status = "completed";
    await order.save();

    console.log(`Payment ${txHash} confirmed for address ${to}`);

    // 8️⃣ Notify user
    await sendMail(
      this.configService.getOrThrow('ADMIN_EMAIL'),
      existingUser.email,
      order.expectedAmount,
      transaction._id.toString(),
      "deposit"
    );

    await this.crewService.updateCrewOnTransaction(
      existingUser.userID,
      "deposit",
      order.expectedAmount
    );

    console.log({
      success: true,
      message: "Transaction Processed Successfully",
      transaction
    });

    return { ok: true };
  }

  async searchUsers(keyword: string): Promise<UserDocument[]> {
    return this.userModel.search(keyword);
  }

  async searchCrews(keyword: string): Promise<CrewDocument[]> {
    return this.crewModel.search(keyword);
  }

  async deleteUserCascade(userID: string) {
    return this.crewExtraService.deleteUser(userID)
  }
}
