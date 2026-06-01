import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  CommunityService,
  CreatePostDto,
  CreateAnswerDto,
} from '../../services/community.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class VoteDto {
  @ApiProperty({ enum: [1, -1] })
  @IsInt()
  value: 1 | -1;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('api/community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get('posts')
  @ApiOperation({ summary: 'List community posts' })
  async listPosts(
    @Query('topic') topic?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  ) {
    return this.communityService.listPosts(topic, page);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create a community post (AI moderated)' })
  async createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(user.id, dto);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a single post with answers' })
  async getPost(@Param('id') id: string) {
    return this.communityService.getPost(id);
  }

  @Post('posts/:id/answers')
  @ApiOperation({ summary: 'Answer a community post' })
  async createAnswer(
    @CurrentUser() user: any,
    @Param('id') postId: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.communityService.createAnswer(user.id, postId, dto);
  }

  @Post('answers/:id/accept')
  @ApiOperation({ summary: 'Accept an answer (post author only)' })
  async acceptAnswer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.communityService.acceptAnswer(user.id, id);
  }

  @Post('posts/:id/vote')
  @ApiOperation({ summary: 'Vote on a post (+1 or -1)' })
  async votePost(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: VoteDto,
  ) {
    return this.communityService.vote(user.id, id, 'post', dto.value);
  }

  @Post('answers/:id/vote')
  @ApiOperation({ summary: 'Vote on an answer (+1 or -1)' })
  async voteAnswer(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: VoteDto,
  ) {
    return this.communityService.vote(user.id, id, 'answer', dto.value);
  }
}
