import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorator/current.logged.user';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionService } from './transaction.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateTransactionDto) {
    return this.transactionService.create(user.sub, dto);
  }

  @Post('earners')
  createEarner(@CurrentUser() user: { email: string }) {
    return this.transactionService.createEarner(user.email);
  }

  @Get()
  findMine(@CurrentUser() user: { sub: string }, @Query() pagination: PaginationDto) {
    return this.transactionService.findMine(user.sub, pagination);
  }

  @Get(':id')
  findOneMine(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.transactionService.findOneMine(user.sub, id);
  }
}
