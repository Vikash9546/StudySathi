import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from '../../services/analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user analytics dashboard data' })
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getUserAnalytics(user.id, days);
  }
}
