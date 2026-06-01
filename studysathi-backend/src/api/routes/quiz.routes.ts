import {
  Controller, Get, Post, Body, Param, Query,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuizService } from '../../services/quiz.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class SubmitAnswerDto {
  @ApiProperty()
  @IsArray()
  answers: { questionId: string; answer: string; timeTaken?: number }[];
}

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller('api/quizzes')
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post('document/:documentId')
  @ApiOperation({ summary: 'Create a quiz from a document' })
  async createDocumentQuiz(
    @CurrentUser() user: any,
    @Param('documentId') documentId: string,
  ) {
    return this.quizService.createDocumentQuiz(user.id, documentId);
  }

  @Post('daily')
  @ApiOperation({ summary: 'Get or create today\'s daily quiz' })
  async dailyQuiz(@CurrentUser() user: any) {
    return this.quizService.createDailyQuiz(user.id);
  }

  @Post(':quizId/start')
  @ApiOperation({ summary: 'Start a quiz attempt' })
  async startAttempt(
    @CurrentUser() user: any,
    @Param('quizId') quizId: string,
  ) {
    return this.quizService.startAttempt(user.id, quizId);
  }

  @Post('attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Submit quiz answers for evaluation' })
  async submitAttempt(
    @CurrentUser() user: any,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizService.submitAttempt(user.id, attemptId, dto.answers);
  }

  @Get('attempts/:attemptId/results')
  @ApiOperation({ summary: 'Get quiz results with topic breakdown' })
  async getResults(
    @CurrentUser() user: any,
    @Param('attemptId') attemptId: string,
  ) {
    return this.quizService.getResults(user.id, attemptId);
  }
}
