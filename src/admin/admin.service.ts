import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User, UserDocument } from '../common/schemas/user/user.schema';
import type { UserModel } from '../common/schemas/user/user.schema';
import { Transaction, TransactionDocument } from '../transaction/schemas/transaction.schema';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { UpdateUserAdministrationDto } from './dto/update-user-administration.dto';
import { TransactionMailService } from 'src/transaction/transaction-mail.service';
import { TransactionType } from 'src/transaction/enum/transaction-type.enum';
import { CopyTradePurchase, CopyTradePurchaseDocument } from '../copy-trading/schemas/copy-trade-purchase.schema';
import { AdminCopyTradePurchaseQueryDto, AdminStockPurchaseQueryDto } from './dto/admin-purchase-query.dto';
import { CopyTrading, CopyTradingDocument } from '../copy-trading/schemas/copy-trading.schema';
import { UpdateCopyTradingDto } from '../copy-trading/dto/update-copy-trading.dto';
import { UpdateCopyTradePurchaseDto } from './dto/update-copy-trade-purchase.dto';
import { CrewService } from '@/crew/crew.service';
import { CrewExtraService } from '@/crew/crewExtra.service';
import { Crew, CrewDocument } from '@/crew/schema/userCrew.schema';
import type { CrewModel } from '@/crew/schema/userCrew.schema';

@Injectable()
export class AdminService {
  constructor(@InjectModel(User.name) private readonly userModel: UserModel, @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>, @InjectModel(CopyTradePurchase.name) private readonly copyTradePurchaseModel: Model<CopyTradePurchaseDocument>, @InjectModel(CopyTrading.name) private readonly copyTradingModel: Model<CopyTradingDocument>, private readonly transactionMailService: TransactionMailService, private crewService: CrewService, private crewExtraService: CrewExtraService, @InjectModel(Crew.name) private crewModel: CrewModel) { }

  async findUsers(pagination: PaginationDto) {
    const page = pagination.page ?? 1; const limit = pagination.limit ?? 20;
    const [data, total] = await Promise.all([this.userModel.find().select('-password -refreshToken').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), this.userModel.countDocuments()]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUser(id: string, dto: UpdateUserAdministrationDto) {
    const user = await this.userModel.findByIdAndUpdate(id, dto, { returnDocument: 'after', runValidators: true }).select('-password -refreshToken');
    if (!user) throw new NotFoundException('User not found');
    return user;
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
