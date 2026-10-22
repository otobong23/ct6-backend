import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorator/current.logged.user.js';
import { JwtAuthGuard } from '../common/strategies/jwt-auth.guard.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { TransactionService } from './transaction.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

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
