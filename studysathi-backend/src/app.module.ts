import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

// Config
import { validateEnv } from './config/env';
import { PrismaModule } from './config/prisma.module';
import { RedisModule } from './config/redis.module';
import { StorageService } from './config/storage.service';

// Auth
import { AuthModule } from './auth/auth.module';

// AI
import { AIGatewayModule } from './ai-gateway/ai-gateway.module';
import { OpenAIProvider } from './ai-gateway/providers/openai.provider';

// Jobs
import { DocumentParseJob } from './jobs/document-parse.job';
import { QuestionGenJob } from './jobs/question-gen.job';
import { FlashcardGenJob } from './jobs/flashcard-gen.job';

// Services
import { DocumentService } from './services/document.service';
import { FlashcardService } from './services/flashcard.service';
import { QuizService } from './services/quiz.service';
import { CommunityService } from './services/community.service';
import { GamificationService } from './services/gamification.service';
import { ProfileService } from './services/profile.service';
import { AITutorService } from './services/ai-tutor.service';
import { StudyPlannerService } from './services/study-planner.service';
import { AnalyticsService } from './services/analytics.service';
import { NotificationService } from './services/notification.service';
import { SubscriptionService } from './services/subscription.service';

// Controllers
import { AuthController } from './api/routes/auth.routes';
import { DocumentController } from './api/routes/document.routes';
import { FlashcardController } from './api/routes/flashcard.routes';
import { QuizController } from './api/routes/quiz.routes';
import { CommunityController } from './api/routes/community.routes';
import { GamificationController } from './api/routes/gamification.routes';
import { ProfileController } from './api/routes/profile.routes';
import { AITutorController } from './api/routes/ai-tutor.routes';
import { StudyPlannerController } from './api/routes/study-planner.routes';
import { AnalyticsController } from './api/routes/analytics.routes';
import { NotificationController } from './api/routes/notifications.routes';
import { SubscriptionController } from './api/routes/subscription.routes';
import { AdminController } from './api/routes/admin.routes';
import { FriendsController } from './api/routes/friends.routes';

// Realtime
import { RealtimeGateway } from './realtime/socket';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // ── Rate Limiting ──────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 60000, limit: 200 },
    ]),

    // ── Database & Cache ───────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Queue (BullMQ) ─────────────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          password: configService.get('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'document-parse' },
      { name: 'question-gen' },
      { name: 'flashcard-gen' },
    ),

    // ── Feature Modules ────────────────────────────────────────────────────
    AuthModule,
    AIGatewayModule,
  ],

  controllers: [
    AuthController,
    DocumentController,
    FlashcardController,
    QuizController,
    CommunityController,
    GamificationController,
    ProfileController,
    AITutorController,
    StudyPlannerController,
    AnalyticsController,
    NotificationController,
    SubscriptionController,
    AdminController,
    FriendsController,
  ],

  providers: [
    // Config-level services
    StorageService,
    OpenAIProvider,

    // Feature services
    DocumentService,
    FlashcardService,
    QuizService,
    CommunityService,
    GamificationService,
    ProfileService,
    AITutorService,
    StudyPlannerService,
    AnalyticsService,
    NotificationService,
    SubscriptionService,

    // BullMQ Workers
    DocumentParseJob,
    QuestionGenJob,
    FlashcardGenJob,

    // Realtime
    RealtimeGateway,
  ],
})
export class AppModule {}
