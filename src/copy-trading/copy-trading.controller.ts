import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorator/current.logged.user.js';
import { AdminGuard } from '../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../common/strategies/jwt-auth.guard.js';
import { LiquidateCopyTradingDto } from './dto/liquidate-copy-trading.dto.js';
import { CreateCopyTradingDto } from './dto/create-copy-trading.dto.js';
import { UpdateCopyTradingDto } from './dto/update-copy-trading.dto.js';
import { CopyTradingService } from './copy-trading.service.js';
import { BuyCopyTradingDto } from './dto/buy-copy-trading.dto.js';

@Controller('copy-trading')
export class CopyTradingController {
  constructor(private readonly copyTradingService: CopyTradingService) {}
  @Get() findAll() { return this.copyTradingService.findAll(); }
  @Get('me/purchases') @UseGuards(JwtAuthGuard) myPurchases(@CurrentUser() user: { sub: string }) { return this.copyTradingService.getMyPurchases(user.sub); }
  @Get(':id') findOne(@Param('id') id: string) { return this.copyTradingService.findOne(id); }
  @Post(':id/buy') @UseGuards(JwtAuthGuard) buy(@CurrentUser() user: { sub: string }, @Param('id') id: string) { return this.copyTradingService.buy(user.sub, id); }
  @Post('purchases/:purchaseId/add-funds') @UseGuards(JwtAuthGuard) addFunds(@CurrentUser() user: { sub: string }, @Param('purchaseId') purchaseId: string, @Body() dto: BuyCopyTradingDto) { return this.copyTradingService.addFunds(user.sub, purchaseId, dto); }
  @Post('purchases/:purchaseId/liquidate') @UseGuards(JwtAuthGuard) liquidate(@CurrentUser() user: { sub: string }, @Param('purchaseId') purchaseId: string, @Body() dto: LiquidateCopyTradingDto) { return this.copyTradingService.liquidate(user.sub, purchaseId, dto); }
  @Post() @UseGuards(JwtAuthGuard, AdminGuard) create(@Body() dto: CreateCopyTradingDto) { return this.copyTradingService.create(dto); }
  @Patch(':id') @UseGuards(JwtAuthGuard, AdminGuard) update(@Param('id') id: string, @Body() dto: UpdateCopyTradingDto) { return this.copyTradingService.update(id, dto); }
  @Delete(':id') @UseGuards(JwtAuthGuard, AdminGuard) remove(@Param('id') id: string) { return this.copyTradingService.remove(id); }
}
