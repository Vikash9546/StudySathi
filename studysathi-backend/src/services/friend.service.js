import { prisma } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../common/errors.js';

export class FriendService {
  async sendFriendRequest(senderId, receiverEmail) {
    const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
    if (!receiver) {
      throw new NotFoundError('User with this email not found');
    }

    if (receiver.id === senderId) {
      throw new BadRequestError('You cannot send a friend request to yourself');
    }

    // Check if a request or active friendship already exists
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId }
        ]
      }
    });

    if (existing) {
      throw new BadRequestError(`Friend request status: ${existing.status}`);
    }

    return prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: 'PENDING',
      }
    });
  }

  async respondToFriendRequest(userId, requestId, status) {
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new BadRequestError('Invalid status response. Must be ACCEPTED or REJECTED.');
    }

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.receiverId !== userId) {
      throw new NotFoundError('Friend request not found or unauthorized');
    }

    return prisma.friendRequest.update({
      where: { id: requestId },
      data: { status }
    });
  }

  async getFriends(userId) {
    const friendships = await prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, xp: true, level: true, avatarUrl: true, streakCount: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, xp: true, level: true, avatarUrl: true, streakCount: true }
        }
      }
    });

    // Map friendships to extract friend profiles
    return friendships.map(f => {
      return f.senderId === userId ? f.receiver : f.sender;
    });
  }

  async followUser(followerId, followingId) {
    if (followerId === followingId) {
      throw new BadRequestError('You cannot follow yourself');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) throw new NotFoundError('Target user not found');

    return prisma.userFollow.upsert({
      where: {
        followerId_followingId: { followerId, followingId }
      },
      update: {},
      create: { followerId, followingId }
    });
  }

  async unfollowUser(followerId, followingId) {
    return prisma.userFollow.deleteMany({
      where: { followerId, followingId }
    });
  }
}

export const friendService = new FriendService();
