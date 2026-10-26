import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user/user.schema.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { TransactionStatus } from './enum/transaction-status.enum.js';
import { Transaction, TransactionDocument } from './schemas/transaction.schema.js';
import { TransactionMailService } from './transaction-mail.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Earner, EarnerDocument } from './schemas/earner.schema.js';
import { TransactionType } from './enum/transaction-type.enum.js';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Earner.name) private earnerModel: Model<EarnerDocument>,
    private readonly transactionMailService: TransactionMailService,
  ) { }

  async create(userId: string, dto: CreateTransactionDto) {
    if ([TransactionType.PROFIT, TransactionType.LOSS, TransactionType.DEPOSIT, TransactionType.WITHDRAW].includes(dto.type)) {
      throw new BadRequestException(`${dto.type} transactions must be created through their dedicated workflow`);
    }
    const user = await this.userModel.findById(userId).select('email');
    if (!user) throw new NotFoundException('User not found');
    const transaction = await this.transactionModel.create({
      userId: user._id,
      email: user.email,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      reference: dto.reference,
      note: dto.note,
      status: TransactionStatus.PENDING,
    });
    if ([TransactionType.DEPOSIT, TransactionType.WITHDRAW].includes(transaction.type)) {
      await this.transactionMailService.sendPendingTransactionToAdmin(transaction);
    }
    return transaction;
  }

  async findMine(userId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [data, total] = await Promise.all([
      this.transactionModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      this.transactionModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOneMine(userId: string, transactionId: string) {
    const transaction = await this.transactionModel.findOne({ _id: new Types.ObjectId(transactionId), userId: new Types.ObjectId(userId) });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  /** Intended for a future AdminService; it deliberately does not change transaction status. */
  async findByIdForAdmin(transactionId: string) {
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }


  async getActiveEarner(email: string) {
    const existingUser = await this.userModel.findOne({ email })
    if (!existingUser) throw new NotFoundException('User not Found, please signup');

    const earners = await this.earnerModel.find({ userId: existingUser._id, status: 'active' }).sort({ nextEarningDate: 1 });
    return { success: earners.length > 0, earners };
  }
}
