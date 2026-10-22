import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CrewService } from './crew.service.js';
import { JwtAuthGuard } from '../common/strategies/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('crew')
export class CrewController {
  constructor(private readonly crewService: CrewService) {}

  @Get()
  async getUserCrew(@Req() req: Request & { user: { email: string } }){
    const email = req.user.email
    return this.crewService.getUserCrew(email)
  }
}
