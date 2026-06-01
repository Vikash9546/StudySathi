import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FlashcardService } from '../../services/flashcard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class ReviewFlashcardDto {
  @ApiProperty({ enum: ['AGAIN', 'HARD', 'GOOD', 'EASY'] })
  @IsEnum(['AGAIN', 'HARD', 'GOOD', 'EASY'])
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}

@ApiTags('flashcards')
@ApiBearerAuth()
@Controller('api/flashcards')
export class FlashcardController {
  constructor(private flashcardService: FlashcardService) {}

  @Get('due')
  @ApiOperation({ summary: 'Get due flashcards for review today' })
  async getDue(@CurrentUser() user: any) {
    return this.flashcardService.getDueFlashcards(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get flashcard statistics' })
  async getStats(@CurrentUser() user: any) {
    return this.flashcardService.getFlashcardStats(user.id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Submit flashcard review with SM-2 rating' })
  async review(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewFlashcardDto,
  ) {
    return this.flashcardService.reviewFlashcard(user.id, id, dto.rating);
  }
}
