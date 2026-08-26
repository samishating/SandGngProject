import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 requires an explicit driver adapter — connection URLs no longer
// live in schema.prisma. This uses the pooled connection (PgBouncer) since
// it's the app's runtime query path; `prisma.config.ts` uses the direct
// connection separately for `migrate`/`db seed`, where pooling causes
// issues with DDL statements.
const adapter = new PrismaPg(process.env.DATABASE_URL!);

// Standard Next.js dev-mode singleton: without this, every hot-reload would
// open a fresh PrismaClient (and a fresh connection pool) on top of the last.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
