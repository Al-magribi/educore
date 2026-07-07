import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/** @type {PrismaClient | undefined} */
const existing = globalForPrisma.prisma;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  const parsed = new URL(url);
  const defaults = {
    connection_limit: "5",
    max_idle_connection_lifetime: "60",
    pool_timeout: "20",
    connect_timeout: "10",
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, value);
    }
  }

  return parsed.toString();
}

export const prisma =
  existing ??
  new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function disconnect() {
  void prisma.$disconnect();
}

process.on("SIGINT", disconnect);
process.on("SIGTERM", disconnect);

export function getDb() {
  return prisma;
}
