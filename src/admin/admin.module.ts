import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from '../common/guards/admin.guard.js';
import { User, UserSchema } from '../common/schemas/user/user.schema.js';
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { TransactionModule } from '../transaction/transaction.module.js';
import { CopyTradePurchase, CopyTradePurchaseSchema } from '../copy-trading/schemas/copy-trade-purchase.schema.js';
import { CopyTrading, CopyTradingSchema } from '../copy-trading/schemas/copy-trading.schema.js';
import { Crew, CrewSchema } from '../crew/schema/userCrew.schema.js';
import { CrewModule } from '../crew/crew.module.js';

@Module({ imports: [AuthModule, TransactionModule, CrewModule, MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Transaction.name, schema: TransactionSchema },
  { name: Crew.name, schema: CrewSchema },
  { name: CopyTradePurchase.name, schema: CopyTradePurchaseSchema },
  { name: CopyTrading.name, schema: CopyTradingSchema },
])], controllers: [AdminController], providers: [AdminService, AdminGuard] })
export class AdminModule {}
