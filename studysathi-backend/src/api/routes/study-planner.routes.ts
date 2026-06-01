import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudyPlannerService } from '../../services/study-planner.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('study-planner')
@ApiBearerAuth()
@Controller('api/study-planner')
export class StudyPlannerController {
  constructor(private studyPlanner: StudyPlannerService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a personalized weekly study plan' })
  async generate(@CurrentUser() user: any) {
    return this.studyPlanner.generateWeeklyPlan(user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current week study plan' })
  async current(@CurrentUser() user: any) {
    return this.studyPlanner.getCurrentPlan(user.id);
  }

  @Post('tasks/:taskId/complete')
  @ApiOperation({ summary: 'Mark a study task as completed' })
  async completeTask(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
  ) {
    return this.studyPlanner.completeTask(user.id, taskId);
  }
}
