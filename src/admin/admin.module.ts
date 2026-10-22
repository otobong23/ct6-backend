import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { User, UserSchema } from '../common/schemas/user/user.schema';
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TransactionModule } from 'src/transaction/transaction.module';
import { CopyTradePurchase, CopyTradePurchaseSchema } from '../copy-trading/schemas/copy-trade-purchase.schema';
import { CopyTrading, CopyTradingSchema } from '../copy-trading/schemas/copy-trading.schema';
import { Crew, CrewSchema } from '@/crew/schema/userCrew.schema';
import { CrewModule } from '@/crew/crew.module';

@Module({ imports: [AuthModule, TransactionModule, CrewModule, MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Transaction.name, schema: TransactionSchema },
  { name: Crew.name, schema: CrewSchema },
  { name: CopyTradePurchase.name, schema: CopyTradePurchaseSchema },
  { name: CopyTrading.name, schema: CopyTradingSchema },
])], controllers: [AdminController], providers: [AdminService, AdminGuard] })
export class AdminModule {}
