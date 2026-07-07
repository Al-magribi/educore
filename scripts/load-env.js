/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const FORCE_IN_PRODUCTION = new Set([
  "AUTH_URL",
  "NEXTAUTH_URL",
  "AUTH_SECRET",
  "DATABASE_URL",
  "PORT",
]);

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eq = trimmed.indexOf("=");
  if (eq === -1) return null;

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

/**
 * Load .env files into process.env.
 * In production, never load `.env.local` (dev-only) and force critical vars from `.env`.
 */
function loadEnvFiles(cwd = process.cwd()) {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.NODE_ENV === undefined;
  const files = isProduction
    ? [".env", ".env.production", ".env.production.local"]
    : [".env", ".env.local", ".env.development", ".env.development.local"];

  for (const file of files) {
    const filePath = path.join(cwd, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;

      const shouldForce = isProduction && FORCE_IN_PRODUCTION.has(parsed.key);
      if (shouldForce || process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}

module.exports = { loadEnvFiles };
