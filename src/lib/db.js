import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/** @type {PrismaClient | undefined} */
const existing = globalForPrisma.prisma;

export const prisma =
  existing ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getDb() {
  return prisma;
}
