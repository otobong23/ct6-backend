import { PartialType } from '@nestjs/mapped-types';
import { CreateCopyTradingDto } from './create-copy-trading.dto';
export class UpdateCopyTradingDto extends PartialType(CreateCopyTradingDto) {}
