import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const reflector = app.get(Reflector);

  // ── Global Pipes ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Guards ─────────────────────────────────────────────────────────
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // ── Global Filters ────────────────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Global Interceptors ───────────────────────────────────────────────────
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('StudySathi API')
    .setDescription(
      'AI-powered EdTech backend — quizzes, flashcards, RAG tutor, gamification, community',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & JWT')
    .addTag('profile', 'User profile & onboarding')
    .addTag('documents', 'Document upload & processing')
    .addTag('quizzes', 'Quiz system')
    .addTag('flashcards', 'Flashcard SM-2 review')
    .addTag('ai-tutor', 'RAG-based AI tutor')
    .addTag('gamification', 'XP, levels, badges, leaderboard')
    .addTag('community', 'Community posts & answers')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 StudySathi API running on http://localhost:${port}`);
  console.log(`📄 Swagger docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();
