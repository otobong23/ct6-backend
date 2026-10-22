import { Module } from '@nestjs/common';
import { CrewService } from './crew.service.js';
import { CrewController } from './crew.controller.js';
import { UserCrewModule } from './schema/userCrew.module.js';
import { JwtStrategy } from '../common/strategies/jwt.strategy.js';
import { Transaction, TransactionSchema } from '../transaction/schemas/transaction.schema.js';
import { CrewExtraService } from './crewExtra.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../common/schemas/user/user.schema.js';
import { CopyTradePurchase, CopyTradePurchaseSchema } from '../copy-trading/schemas/copy-trade-purchase.schema.js';

@Module({
  imports: [ UserCrewModule, MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: CopyTradePurchase.name, schema: CopyTradePurchaseSchema }
  ]) ],
  controllers: [CrewController],
  providers: [CrewService, JwtStrategy, CrewExtraService],
  exports: [CrewService, CrewExtraService]
})
export class CrewModule {}
 