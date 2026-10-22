import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/strategies/jwt-auth.guard';
import { LoginDto } from '../auth/dto/auth.dto';
import { AuthService } from '../auth/auth.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { UpdateUserAdministrationDto } from './dto/update-user-administration.dto';
import { AdminService } from './admin.service';
import { AdminCopyTradePurchaseQueryDto, AdminUserParamsDto } from './dto/admin-purchase-query.dto';
import { UpdateCopyTradingDto } from '../copy-trading/dto/update-copy-trading.dto';
import { UpdateCopyTradePurchaseDto } from './dto/update-copy-trade-purchase.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.loginAdmin(dto); }

  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  users(@Query() pagination: PaginationDto) { return this.adminService.findUsers(pagination); }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdministrationDto) { return this.adminService.updateUser(id, dto); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('search/users')
  async searchUsers(@Query('keyword') keyword: string) {
    return this.adminService.searchUsers(keyword);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  transactions(@Query() pagination: PaginationDto) { return this.adminService.findTransactions(pagination); }

  @Patch('transactions/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateTransactionStatus(@Param('id') id: string, @Body() dto: UpdateTransactionStatusDto) { return this.adminService.updateTransactionStatus(id, dto); }

  @Get('copy-trade-purchases')
  @UseGuards(JwtAuthGuard, AdminGuard)
  copyTradePurchases(@Query() query: AdminCopyTradePurchaseQueryDto) { return this.adminService.findCopyTradePurchases(query); }

  @Patch('copy-trade-purchases/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCopyTradePurchase(@Param('id') id: string, @Body() dto: UpdateCopyTradePurchaseDto) {
    return this.adminService.updateCopyTradePurchase(id, dto);
  }

  @Patch('copy-trading/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCopyTrading(@Param('id') id: string, @Body() dto: UpdateCopyTradingDto) {
    return this.adminService.updateCopyTrading(id, dto);
  }

  @Get('users/:userId/copy-trade-purchases')
  @UseGuards(JwtAuthGuard, AdminGuard)
  userCopyTradePurchases(@Param() params: AdminUserParamsDto, @Query() query: AdminCopyTradePurchaseQueryDto) {
    return this.adminService.findCopyTradePurchases({ ...query, userId: params.userId });
  }

  // ─────────────── CREWS ───────────────
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('totalCrews')
  async getTotalCrew() {
    return await this.adminService.getTotalCrews()
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('crews')
  async getAllCrews(
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('page', ParseIntPipe) page = 1
  ) {
    return await this.adminService.getAllCrews(limit, page);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('crew')
  async getUserCrew(@Query('userID') userID: string) {
    return await this.adminService.getUserCrew(userID);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/crews')
  async searchCrews(@Query('keyword') keyword: string) {
    return this.adminService.searchCrews(keyword);
  }

  // ─────────────── ACTIONS ───────────────
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('detachUser')
  async detachUser(@Body() { userID }: { userID: string }) {
    return await this.adminService.deleteUserCascade(userID)
  }
}
