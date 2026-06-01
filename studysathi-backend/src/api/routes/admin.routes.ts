import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../config/prisma.service';
import { UsageTrackerService } from '../../ai-gateway/logger/usage-tracker';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('api/admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private usageTracker: UsageTrackerService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          xp: true,
          level: true,
          createdAt: true,
          isEmailVerified: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { users, total, page, limit };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id') id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        documents: {
          select: { id: true, title: true, status: true, createdAt: true },
        },
        subscription: true,
        _count: {
          select: {
            quizAttempts: true,
            flashcardReviews: true,
            communityPosts: true,
          },
        },
      },
    });
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user account' })
  async deleteUser(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }

  @Get('moderation/pending')
  @ApiOperation({ summary: 'Get community posts pending moderation' })
  async pendingModeration(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.prisma.communityPost.findMany({
      where: { status: 'PENDING_MODERATION' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
    });
  }

  @Get('ai-usage')
  @ApiOperation({ summary: 'Get AI usage and cost statistics' })
  async aiUsage(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageTracker.getSystemUsage(days);
  }

  @Get('stats')
  @ApiOperation({ summary: 'System health and statistics' })
  async systemStats() {
    const [users, documents, quizAttempts, flashcardReviews, communityPosts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.document.count(),
        this.prisma.quizAttempt.count(),
        this.prisma.flashcardReview.count(),
        this.prisma.communityPost.count(),
      ]);

    const proUsers = await this.prisma.user.count({ where: { plan: 'PRO' } });

    return {
      users: { total: users, pro: proUsers, free: users - proUsers },
      content: { documents, quizAttempts, flashcardReviews, communityPosts },
      health: { status: 'ok', timestamp: new Date().toISOString() },
    };
  }
}
