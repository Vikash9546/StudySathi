import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

function normalizeDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    return databaseUrl;
  }

  if (databaseUrl.includes('.pooler.supabase.com') && !databaseUrl.includes('pgbouncer=true')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    return `${databaseUrl}${separator}pgbouncer=true&connection_limit=1`;
  }

  return databaseUrl;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: normalizeDatabaseUrl(env('DATABASE_URL')),
  },
});
