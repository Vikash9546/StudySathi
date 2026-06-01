import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AITutorService } from '../../services/ai-tutor.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class AskQuestionDto {
  @ApiProperty({ example: "Explain Newton's second law" })
  @IsString()
  question: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

@ApiTags('ai-tutor')
@ApiBearerAuth()
@Controller('api/ai-tutor')
export class AITutorController {
  constructor(private aiTutorService: AITutorService) {}

  @Post('ask')
  @ApiOperation({
    summary: 'Ask AI tutor a question (RAG from your documents)',
  })
  async ask(@CurrentUser() user: any, @Body() dto: AskQuestionDto) {
    return this.aiTutorService.askQuestion(
      user.id,
      dto.question,
      dto.documentId,
      dto.sessionId,
    );
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get AI tutor chat sessions' })
  async sessions(@CurrentUser() user: any) {
    return this.aiTutorService.getSessions(user.id);
  }

  @Post('documents/:id/index')
  @ApiOperation({ summary: 'Index document for vector search (AI Tutor)' })
  async indexDocument(@CurrentUser() user: any, @Param('id') id: string) {
    await this.aiTutorService.indexDocument(id);
    return { message: 'Document indexed for AI tutor' };
  }

  @Post('documents/:id/revision-notes')
  @ApiOperation({ summary: 'Generate AI revision notes for a document' })
  async revisionNotes(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiTutorService.generateRevisionNotes(user.id, id);
  }

  @Post('documents/:id/mind-map')
  @ApiOperation({ summary: 'Generate AI mind map for a document' })
  async mindMap(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiTutorService.generateMindMap(user.id, id);
  }
}
