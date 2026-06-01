import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../config/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamificationService } from '../../services/gamification.service';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('api/friends')
export class FriendsController {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  @Post(':userId/request')
  @ApiOperation({ summary: 'Send a friend request' })
  async sendRequest(
    @CurrentUser() user: any,
    @Param('userId') targetId: string,
  ) {
    const existing = await this.prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: { senderId: user.id, receiverId: targetId },
      },
    });
    if (existing) return { message: 'Friend request already sent' };
    return this.prisma.friendRequest.create({
      data: { senderId: user.id, receiverId: targetId },
    });
  }

  @Post('requests/:id/accept')
  @ApiOperation({ summary: 'Accept a friend request' })
  async acceptRequest(@CurrentUser() user: any, @Param('id') id: string) {
    const req = await this.prisma.friendRequest.findFirst({
      where: { id, receiverId: user.id },
    });
    if (!req) throw new Error('Request not found');
    return this.prisma.friendRequest.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get friends list' })
  async getFriends(@CurrentUser() user: any) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            xp: true,
            level: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            xp: true,
            level: true,
          },
        },
      },
    });

    return requests.map((r) =>
      r.senderId === user.id ? r.receiver : r.sender,
    );
  }

  @Post(':userId/follow')
  @ApiOperation({ summary: 'Follow a user' })
  async follow(@CurrentUser() user: any, @Param('userId') targetId: string) {
    return this.prisma.userFollow.upsert({
      where: {
        followerId_followingId: { followerId: user.id, followingId: targetId },
      },
      update: {},
      create: { followerId: user.id, followingId: targetId },
    });
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Friends leaderboard' })
  async friendsLeaderboard(@CurrentUser() user: any) {
    return this.gamification.getLeaderboard('weekly', user.id);
  }
}
