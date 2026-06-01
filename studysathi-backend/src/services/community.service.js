import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';
import { gamificationService } from './gamification.service.js';

export class CommunityService {
  async createPost(userId, title, content, topics) {
    const moderationPrompt = `Evaluate the following community post for toxicity, hate speech, spam, abusive contents, or completely off-topic educational questions.
Post Title: "${title}"
Post Content: "${content}"

Respond ONLY in the following JSON format:
{
  "approved": true or false,
  "reason": "If rejected, write why here, otherwise leave empty"
}`;

    let approved = true;
    let reason = '';

    try {
      const moderationRes = await aiGateway.generateText({
        prompt: moderationPrompt,
        userId,
        model: 'groq',
      });
      const cleanJson = moderationRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const check = JSON.parse(cleanJson);
      approved = check.approved;
      reason = check.reason;
    } catch (err) {
      console.error('Moderation parsing failed, defaulting to approved:', err);
    }

    if (!approved) {
      throw new Error(reason || 'Post content was flagged by the AI moderator.');
    }

    return prisma.communityPost.create({
      data: {
        userId,
        title,
        content,
        topics,
        status: 'APPROVED',
      }
    });
  }

  async getPosts(topic = null) {
    const where = { status: 'APPROVED' };
    if (topic) {
      where.topics = { has: topic };
    }

    return prisma.communityPost.findMany({
      where,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPostById(id) {
    return prisma.communityPost.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        answers: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
          },
          orderBy: { upvotes: 'desc' },
        }
      }
    });
  }

  async createAnswer(userId, postId, content) {
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    return prisma.communityAnswer.create({
      data: {
        postId,
        userId,
        content,
      }
    });
  }

  async acceptAnswer(userId, answerId) {
    const answer = await prisma.communityAnswer.findUnique({
      where: { id: answerId },
      include: { post: true },
    });

    if (!answer || answer.post.userId !== userId) {
      throw new Error('Unauthorized accept action');
    }

    const updated = await prisma.communityAnswer.update({
      where: { id: answerId },
      data: { isAccepted: true },
    });

    await gamificationService.awardXP(answer.userId, 50, `Your answer was accepted on: ${answer.post.title}`);

    return updated;
  }

  async votePost(userId, postId, value) {
    const existingVote = await prisma.vote.findFirst({
      where: { userId, postId },
    });

    if (existingVote) {
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { value },
      });
    } else {
      await prisma.vote.create({
        data: { userId, postId, value },
      });
    }

    // Recalculate sums
    const votes = await prisma.vote.findMany({ where: { postId } });
    const upvotes = votes.filter(v => v.value === 1).length;
    const downvotes = votes.filter(v => v.value === -1).length;

    return prisma.communityPost.update({
      where: { id: postId },
      data: { upvotes, downvotes },
    });
  }
}

export const communityService = new CommunityService();
