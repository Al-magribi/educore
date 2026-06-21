/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src/app");
const MANIFEST = path.join(ROOT, ".next/dev/server/app-paths-manifest.json");
const ROUTES_MANIFEST = path.join(ROOT, ".next/dev/routes-manifest.json");
const TURBOPACK_SSR_RUNTIME = path.join(
  ROOT,
  ".next/dev/server/chunks/ssr/[turbopack]_runtime.js"
);
const PAGES_DOCUMENT = path.join(ROOT, ".next/dev/server/pages/_document.js");
const PAGE_FILE = /^page\.(js|jsx|ts|tsx)$/;

function isDevCacheHealthy() {
  const devDir = path.join(ROOT, ".next/dev");
  if (!fs.existsSync(devDir)) return true;

  const serverDir = path.join(devDir, "server");

  // Partial turbopack build: pages shell without SSR runtime
  if (fs.existsSync(PAGES_DOCUMENT) && !fs.existsSync(TURBOPACK_SSR_RUNTIME)) {
    return false;
  }

  // Interrupted dev bootstrap leaves server output without route manifests
  if (fs.existsSync(serverDir) && !fs.existsSync(ROUTES_MANIFEST)) {
    return false;
  }

  return true;
}

function collectPageManifestKeys(dir, relative = "") {
  const keys = [];

  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const nextRelative = relative ? `${relative}/${name}` : name;

    if (fs.statSync(fullPath).isDirectory()) {
      keys.push(...collectPageManifestKeys(fullPath, nextRelative));
      continue;
    }

    if (!PAGE_FILE.test(name)) continue;

    const route = nextRelative.replace(/\/page\.(js|jsx|ts|tsx)$/, "");
    keys.push(`/${route.replace(/\\/g, "/")}/page`);
  }

  return keys;
}

function clearDevCache(reason) {
  fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
  console.log(`Dev cache cleared (${reason}).`);
}

function main() {
  if (!fs.existsSync(APP_DIR)) return;

  if (!isDevCacheHealthy()) {
    clearDevCache("incomplete turbopack build");
    return;
  }

  const expectedKeys = new Set(collectPageManifestKeys(APP_DIR));
  if (expectedKeys.size === 0) return;

  if (!fs.existsSync(MANIFEST)) return;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    clearDevCache("invalid route manifest");
    return;
  }

  const registeredKeys = new Set(
    Object.keys(manifest).filter((key) => !key.startsWith("/_"))
  );

  for (const key of expectedKeys) {
    if (!registeredKeys.has(key)) {
      clearDevCache("route manifest out of sync");
      return;
    }
  }
}

main();
