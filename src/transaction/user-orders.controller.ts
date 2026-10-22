import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorator/current.logged.user';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { CreateUserOrderDto } from './dto/create-user-order.dto';
import { WithdrawDto } from './dto/create-withdraw-order.dto';
import { UserOrdersService } from './UserOrders.service';

@Controller('transactions/orders')
@UseGuards(JwtAuthGuard)
export class UserOrdersController {
  constructor(private readonly userOrdersService: UserOrdersService) {}

  @Post('deposit-address')
  generateDepositAddress(
    @CurrentUser() user: { email: string },
    @Body() dto: CreateUserOrderDto,
  ) {
    return this.userOrdersService.generatePaymentAddress(dto.amount, user.email);
  }

  @Post(':orderId/confirm-deposit')
  confirmDeposit(
    @CurrentUser() user: { email: string },
    @Param('orderId') orderId: string,
  ) {
    return this.userOrdersService.createDepositTransaction(orderId, user.email);
  }

  @Post('withdraw')
  withdraw(
    @CurrentUser() user: { email: string },
    @Body() dto: WithdrawDto,
  ) {
    return this.userOrdersService.withdraw(dto, user.email);
  }
}
