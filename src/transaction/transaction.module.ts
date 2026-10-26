import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../common/schemas/user/user.schema.js';
import { Transaction, TransactionSchema } from './schemas/transaction.schema.js';
import { TransactionController } from './transaction.controller.js';
import { UserOrdersController } from './user-orders.controller.js';
import { TransactionMailService } from './transaction-mail.service.js';
import { TransactionService } from './transaction.service.js';
import { UserOrder, UserOrderSchema } from './schemas/userOrder.schema.js';
import { UserOrdersService } from './UserOrders.service.js';
import { Earner, EarnerSchema } from './schemas/earner.schema.js';
import { CopyTradePurchase, CopyTradePurchaseSchema } from '../copy-trading/schemas/copy-trade-purchase.schema.js';
import { CrewModule } from '../crew/crew.module.js';
import { CopyTradeEarningsWorker } from './copy-trade-earnings.worker.js';

@Module({
  imports: [
    CrewModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: UserOrder.name, schema: UserOrderSchema },
      { name: Earner.name, schema: EarnerSchema },
      { name: CopyTradePurchase.name, schema: CopyTradePurchaseSchema },
    ]),
  ],
  controllers: [TransactionController, UserOrdersController],
  providers: [TransactionService, TransactionMailService, UserOrdersService, CopyTradeEarningsWorker],
  exports: [TransactionService, TransactionMailService, UserOrdersService],
})
export class TransactionModule {}
