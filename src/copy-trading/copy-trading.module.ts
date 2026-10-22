import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGuard } from '../common/guards/admin.guard';
import { User, UserSchema } from '../common/schemas/user/user.schema';
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema';
import { CopyTradingController } from './copy-trading.controller';
import { CopyTradingService } from './copy-trading.service';
import { CopyTradePurchase, CopyTradePurchaseSchema } from './schemas/copy-trade-purchase.schema';
import { CopyTrading, CopyTradingSchema } from './schemas/copy-trading.schema';

@Module({ imports: [MongooseModule.forFeature([{ name: CopyTrading.name, schema: CopyTradingSchema }, { name: CopyTradePurchase.name, schema: CopyTradePurchaseSchema }, { name: User.name, schema: UserSchema }, { name: Transaction.name, schema: TransactionSchema }])], controllers: [CopyTradingController], providers: [CopyTradingService, AdminGuard], exports: [CopyTradingService] })
export class CopyTradingModule {}
