import { Module } from '@nestjs/common';
import { CrewService } from './crew.service';
import { CrewController } from './crew.controller';
import { UserCrewModule } from './schema/userCrew.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { Transaction, TransactionSchema } from '@/transaction/schemas/transaction.schema';
import { CrewExtraService } from './crewExtra.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/common/schemas/user/user.schema';
import { CopyTradePurchase, CopyTradePurchaseSchema } from '@/copy-trading/schemas/copy-trade-purchase.schema';

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
 