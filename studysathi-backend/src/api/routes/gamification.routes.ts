import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GamificationService } from '../../services/gamification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('api/gamification')
export class GamificationController {
  constructor(private gamification: GamificationService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user XP, level, streak, and badges' })
  async getStats(@CurrentUser() user: any) {
    return this.gamification.getUserStats(user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard (weekly, monthly, global)' })
  @ApiQuery({
    name: 'type',
    enum: ['weekly', 'monthly', 'global'],
    required: false,
  })
  async getLeaderboard(
    @CurrentUser() user: any,
    @Query('type') type: 'weekly' | 'monthly' | 'global' = 'weekly',
  ) {
    return this.gamification.getLeaderboard(type, user.id);
  }
}
