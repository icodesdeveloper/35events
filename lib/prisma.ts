import { PrismaClient } from "@prisma/client";

// Cache the client on `globalThis` in dev so Next's hot-reload doesn't
// spawn a fresh connection pool on every module reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
