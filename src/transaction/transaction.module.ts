import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/common/schemas/user/user.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionController } from './transaction.controller';
import { UserOrdersController } from './user-orders.controller';
import { TransactionMailService } from './transaction-mail.service';
import { TransactionService } from './transaction.service';
import { UserOrder, UserOrderSchema } from './schemas/userOrder.schema';
import { UserOrdersService } from './UserOrders.service';
import { Earner, EarnerSchema } from './schemas/earner.schema';
import { CopyTradePurchase, CopyTradePurchaseSchema } from '@/copy-trading/schemas/copy-trade-purchase.schema';
import { CrewModule } from '@/crew/crew.module';

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
  providers: [TransactionService, TransactionMailService, UserOrdersService],
  exports: [TransactionService, TransactionMailService, UserOrdersService],
})
export class TransactionModule {}
