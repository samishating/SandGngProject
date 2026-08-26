// Prisma 7 moved connection URLs out of schema.prisma — this file is what
// `prisma migrate`/`prisma db seed` use. The running app itself connects
// via the driver adapter in lib/prisma.ts instead (see there for why).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Direct (non-pooled) connection — DDL from `migrate` doesn't play
    // well with PgBouncer's transaction pooling mode. Falls back to
    // DATABASE_URL if DIRECT_URL isn't set (e.g. a non-Supabase Postgres
    // with no pooler in front of it, where there's only one URL anyway).
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
