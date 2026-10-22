import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorator/current.logged.user.js';
import { JwtAuthGuard } from '../common/strategies/jwt-auth.guard.js';
import { CreateUserOrderDto } from './dto/create-user-order.dto.js';
import { WithdrawDto } from './dto/create-withdraw-order.dto.js';
import { UserOrdersService } from './UserOrders.service.js';

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
