// Inject safe defaults for required env vars during e2e tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/testdb';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-0123456789';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'google-client-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'r2-access-key';
process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'r2-secret-key';
process.env.R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'test-bucket';
process.env.R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'http://localhost:8000';
process.env.R2_ENDPOINT = process.env.R2_ENDPOINT || 'http://localhost:8000';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'anthropic-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'openai-key';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gemini-key';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'groq-key';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
process.env.SMTP_USER = process.env.SMTP_USER || 'user';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'pass';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test@example.com';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Optional: Meilisearch key
process.env.MEILISEARCH_KEY = process.env.MEILISEARCH_KEY || '';
