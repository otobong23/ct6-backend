import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { UserOrder, UserOrderDocument } from "./schemas/userOrder.schema.js";
import { Model } from "mongoose";
import { User, UserDocument } from "../common/schemas/user/user.schema.js";
import { Transaction, TransactionDocument } from "./schemas/transaction.schema.js";
import { VARIABLES } from "../common/constant/variables.js";
import { WithdrawDto } from "./dto/create-withdraw-order.dto.js";
import { TransactionStatus } from "./enum/transaction-status.enum.js";
import { TransactionType } from "./enum/transaction-type.enum.js";
import { sendMail } from "../common/helpers/mailer.js";
import { comparedHashed } from "../common/hashed/hashed.data.js";

const EXPIRY_MINUTES = 30;
const to = process.env.EMAIL_USER!

@Injectable()
export class UserOrdersService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserOrder.name) private readonly userOrderModel: Model<UserOrderDocument>,
  ) { }

  async generatePaymentAddress(amount: number, email: string): Promise<{ message: string, order: UserOrderDocument }> {

    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) throw new NotFoundException('User not found');

    if (existingUser.isSuspended) {
      throw new NotFoundException('Your account has been suspended');
    }

    try {

      // 0.2 is for network charge, so it's included in the deposit 
      const fixedAmount = Number(amount);
      const offset = Number((Math.random() * 0.4).toFixed(3));
      let price_amount = fixedAmount + offset + 0.2;

      let retries = 3;
      while (retries > 0) {
        const exists = await this.userOrderModel.findOne({ displayAmount: price_amount, status: 'pending' });
        if (!exists) break;

        price_amount = fixedAmount + Number((Math.random() * 0.4).toFixed(2)) + 0.2;
        retries--;
      }

      const invoice = {
        pay_address: VARIABLES.DEPOSIT_WALLET_ADDRESS.USDT_BEP20,
        pay_amount: fixedAmount,
        order_id: crypto.randomUUID(),
        price_amount
      };

      const newUserOrder = new this.userOrderModel({
        email,
        userId: existingUser.userID,
        address: invoice.pay_address,
        displayAmount: invoice.price_amount,  // this is the randomized amount the user will pay, used to identify the transaction
        expectedAmount: invoice.pay_amount,   // this is the actual amount the user should pay, used for record-keeping
        invoiceId: invoice.order_id,
        status: "pending",
        expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000),
      });

      await newUserOrder.save();

      return {
        message: "Payment invoice generated successfully",
        order: newUserOrder
      };

    } catch (err: any) {
      console.error("Payment Address error:", err?.message || err);
      throw new InternalServerErrorException("Failed to create payment invoice");
    }
  }

  async createDepositTransaction(orderID: string, email: string) {
    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) throw new NotFoundException('User not found. Please sign up.');
    const order = await this.userOrderModel.findById(orderID);
    if (!order) throw new NotFoundException('order not found');
    if (order.email !== email) throw new ForbiddenException('You are not authorized to confirm this deposit');
    if (order.status !== 'pending') throw new BadRequestException('This order has already been processed');
    if (order.referenceID) return { message: 'This order has already been processed', success: false, redirect: true };
    const newTransaction = new this.transactionModel({ orderId: order._id, email, userId: existingUser._id, type: 'deposit', amount: order.displayAmount, status: 'pending', date: new Date() }) as TransactionDocument & { _id: any };
    await newTransaction.save();

    order.referenceID = newTransaction._id.toString();
    await order.save();
    // const mailSent = await sendMail(to, existingUser.email, Number(order.displayAmount), newTransaction._id.toString(), 'deposit')
    return { message: 'Deposit request submitted successfully', transaction: newTransaction, redirect: false }
  }

  async withdraw(withdrawDto: WithdrawDto, email: string) {
    const { walletAddress, amount, walletPassword } = withdrawDto;
    const existingUser = await this.userModel.findOne({ email }).select('+walletPassword')
    if (existingUser) {
      if (!existingUser.isSuspended) {
        if (!existingUser.walletPassword) throw new ConflictException('Create a wallet password in Security settings before withdrawing');
        if (!(await comparedHashed(walletPassword, existingUser.walletPassword))) throw new UnauthorizedException('Wallet password is incorrect');
        existingUser.withdrawStatus = TransactionStatus.PENDING;
        const now = new Date()

        // Get day name in Africa/Lagos timezone
        const day = now.toLocaleString("en-US", {
          timeZone: "Africa/Lagos",
          weekday: "long"
        });

        // Restrict weekends
        if (["Saturday", "Sunday"].includes(day)) {
          throw new ConflictException("Withdrawals aren't allowed on weekends. Withdrawals reopen at 09:00 AM Monday (Africa/Lagos time).");
        }

        const hour = parseInt(now.toLocaleString("en-US", { timeZone: "Africa/Lagos", hour: "numeric", hour12: false }))
        if (hour < 9 || hour >= 17) {
          throw new ConflictException('Withdrawals are only Allowed from 09:00AM - 05:00PM UTC+1 Timezone. Please try again during business hours.')
        }
        if (amount < 12) {
          throw new ConflictException('Minimum Withdrawal is $12.00')
        }
        if (existingUser.balance < amount) {
          throw new ConflictException('Insufficient balance for withdrawal')
        }
        const pendingWithdrawal = await this.transactionModel.findOne({ email, type: TransactionType.WITHDRAW, status: TransactionStatus.PENDING });
        if (pendingWithdrawal) throw new ConflictException('You have a pending Withdrawal request. Please wait for it to be processed before making another request.');

        existingUser.balance -= amount;
        const percent = Number(amount) * 0.10
        const newTransaction = new this.transactionModel({ email, userId: existingUser.userID, type: 'withdrawal', amount, status: 'pending', withdrawWalletAddress: walletAddress, date: new Date(), displayAmount: amount - percent }) as TransactionDocument & { _id: any };
        await newTransaction.save();
        const mailSent = await sendMail(to, existingUser.email, amount - percent, newTransaction._id.toString(), 'withdrawal')
        if (!mailSent) {
          throw new InternalServerErrorException('Failed to send withdrawal Confirmation email')
        }

        await existingUser.save();
        // await this.crewService.updateCrewOnTransaction(existingUser.userID, "withdraw", amount)
        return { message: 'Withdrawal request submitted successfully', newTransaction }
      } else {
        throw new ConflictException('Your account has been suspended. Please Vist Customer Care')
      }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }
}
