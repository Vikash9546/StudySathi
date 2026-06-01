import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';
import { GamificationService } from './gamification.service';
import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  topics?: string[];
}

export class CreateAnswerDto {
  @ApiProperty()
  @IsString()
  content: string;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
    private gamification: GamificationService,
  ) {}

  // ── Create Post (with AI moderation) ──────────────────────────────────────
  async createPost(userId: string, dto: CreatePostDto) {
    // AI moderation
    const modResult = await this.aiGateway.complete(
      AITask.MODERATION,
      `You are a content moderator for an educational platform. Analyze the provided content for:
1. Spam or promotional content
2. Abuse or harassment
3. Toxic language
4. Harmful content
5. Off-topic (not related to education/studying)

Return JSON: { "approved": boolean, "reason": "string" }`,
      `Title: ${dto.title}\nContent: ${dto.content}`,
      { userId },
    );

    let modData = { approved: true, reason: '' };
    try {
      const jsonMatch = modResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) modData = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn('Could not parse moderation JSON');
    }

    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        topics: dto.topics ?? [],
        status: modData.approved ? 'APPROVED' : 'REJECTED',
        moderationReason: modData.approved ? null : modData.reason,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    if (!modData.approved) {
      throw new BadRequestException(`Post rejected: ${modData.reason}`);
    }

    return post;
  }

  // ── List Posts ──────────────────────────────────────────────────────────────
  async listPosts(topic?: string, page = 1, limit = 20) {
    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: {
          status: 'APPROVED',
          ...(topic ? { topics: { has: topic } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { answers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityPost.count({ where: { status: 'APPROVED' } }),
    ]);
    return { posts, total, page, limit };
  }

  // ── Get single post ─────────────────────────────────────────────────────────
  async getPost(postId: string) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, status: 'APPROVED' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        answers: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: [{ isAccepted: 'desc' }, { upvotes: 'desc' }],
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  // ── Answer a post ────────────────────────────────────────────────────────────
  async createAnswer(userId: string, postId: string, dto: CreateAnswerDto) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, status: 'APPROVED' },
    });
    if (!post) throw new NotFoundException('Post not found');

    const answer = await this.prisma.communityAnswer.create({
      data: { userId, postId, content: dto.content },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return answer;
  }

  // ── Accept answer ───────────────────────────────────────────────────────────
  async acceptAnswer(userId: string, answerId: string) {
    const answer = await this.prisma.communityAnswer.findUnique({
      where: { id: answerId },
      include: { post: true },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.post.userId !== userId) {
      throw new BadRequestException('Only post author can accept an answer');
    }

    await this.prisma.communityAnswer.update({
      where: { id: answerId },
      data: { isAccepted: true },
    });

    // Award XP to answer author
    await this.gamification.awardXP(
      answer.userId,
      20,
      'Answer accepted in community',
    );

    return { message: 'Answer accepted' };
  }

  // ── Vote on post/answer ─────────────────────────────────────────────────────
  async vote(
    userId: string,
    targetId: string,
    targetType: 'post' | 'answer',
    value: 1 | -1,
  ) {
    // Remove existing vote
    await this.prisma.vote.deleteMany({
      where: {
        userId,
        ...(targetType === 'post'
          ? { postId: targetId }
          : { answerId: targetId }),
      },
    });

    await this.prisma.vote.create({
      data: {
        userId,
        ...(targetType === 'post'
          ? { postId: targetId }
          : { answerId: targetId }),
        value,
      },
    });

    // Update vote count
    const votes = await this.prisma.vote.findMany({
      where:
        targetType === 'post' ? { postId: targetId } : { answerId: targetId },
    });
    const upvotes = votes.filter((v) => v.value > 0).length;
    const downvotes = votes.filter((v) => v.value < 0).length;

    if (targetType === 'post') {
      await this.prisma.communityPost.update({
        where: { id: targetId },
        data: { upvotes, downvotes },
      });
    } else {
      await this.prisma.communityAnswer.update({
        where: { id: targetId },
        data: { upvotes },
      });
      // Award XP for upvote received
      if (value === 1) {
        const answer = await this.prisma.communityAnswer.findUnique({
          where: { id: targetId },
        });
        if (answer)
          await this.gamification.awardXP(answer.userId, 5, 'Upvote received');
      }
    }

    return { upvotes, downvotes };
  }
}
