import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { IsString, IsOptional, IsDateString, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  examGoal?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  subjects?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  dailyTargetMins?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  examDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pushToken?: string;
}

export class CompleteOnboardingDto {
  @ApiProperty()
  @IsString()
  examGoal: string;

  @ApiProperty()
  @IsArray()
  subjects: string[];

  @ApiProperty()
  @IsNumber()
  dailyTargetMins: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  examDate?: string;
}

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        plan: true, examGoal: true, subjects: true,
        dailyTargetMins: true, examDate: true, onboardingDone: true,
        xp: true, level: true, streakCount: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
      },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        plan: true, examGoal: true, subjects: true,
        dailyTargetMins: true, examDate: true, onboardingDone: true,
      },
    });
    return updated;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        examGoal: dto.examGoal,
        subjects: dto.subjects,
        dailyTargetMins: dto.dailyTargetMins,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        onboardingDone: true,
      },
    });
  }

  async getWeakTopics(userId: string) {
    const performances = await this.prisma.topicPerformance.findMany({
      where: { userId },
      orderBy: { accuracy: 'asc' },
    });
    return {
      weak: performances.filter(p => p.accuracy < 60),
      medium: performances.filter(p => p.accuracy >= 60 && p.accuracy < 80),
      strong: performances.filter(p => p.accuracy >= 80),
    };
  }

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, xp: true, level: true, streakCount: true,
        dailyTargetMins: true, examGoal: true, examDate: true,
      },
    });

    const [recentDocs, weakTopics, dueFlashcards] = await Promise.all([
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      this.prisma.topicPerformance.findMany({
        where: { userId, accuracy: { lt: 60 } },
        orderBy: { accuracy: 'asc' },
        take: 5,
      }),
      this.prisma.flashcardReview.findMany({
        where: { userId, nextReviewDate: { lte: new Date() } },
        distinct: ['flashcardId'],
      }),
    ]);

    return {
      user,
      recentDocuments: recentDocs,
      weakTopics,
      dueFlashcardsCount: dueFlashcards.length,
    };
  }
}
