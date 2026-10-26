import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGuard } from '../common/guards/admin.guard.js';
import { User, UserSchema } from '../common/schemas/user/user.schema.js';
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema.js';
import { CopyTradingController } from './copy-trading.controller.js';
import { CopyTradingService } from './copy-trading.service.js';
import { CopyTradePurchase, CopyTradePurchaseSchema } from './schemas/copy-trade-purchase.schema.js';
import { CopyTrading, CopyTradingSchema } from './schemas/copy-trading.schema.js';
import { Earner, EarnerSchema } from '../transaction/schemas/earner.schema.js';

@Module({ imports: [MongooseModule.forFeature([{ name: CopyTrading.name, schema: CopyTradingSchema }, { name: CopyTradePurchase.name, schema: CopyTradePurchaseSchema }, { name: User.name, schema: UserSchema }, { name: Transaction.name, schema: TransactionSchema }, { name: Earner.name, schema: EarnerSchema }])], controllers: [CopyTradingController], providers: [CopyTradingService, AdminGuard], exports: [CopyTradingService] })
export class CopyTradingModule {}
