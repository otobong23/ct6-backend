import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserAdministrationDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsNumber()
  @IsOptional()
  totalWithdraw?: number;

  @IsNumber()
  @IsOptional()
  totalDeposit?: number;

  @IsNumber()
  @IsOptional()
  transactionCount?: number;
  
  @IsString()
  @IsOptional()
  walletAddress?: string;
  
  @IsString()
  @IsOptional()
  @MinLength(8)
  walletPassword?: string;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
