import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CrewService } from './crew.service';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';

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
