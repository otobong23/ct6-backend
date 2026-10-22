import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDTO } from './create.user.dto.js';

export class UpdateUserDTO extends OmitType(PartialType(CreateUserDTO), ['email', 'password', 'authId'] as const) {}
