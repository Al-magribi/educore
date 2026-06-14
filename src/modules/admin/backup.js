import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db.js";
import { getUploadRoot } from "@/lib/storage/paths.js";

export const BACKUP_VERSION = 1;
const MAX_UPLOAD_BACKUP_BYTES = 100 * 1024 * 1024;

async function walkUploadFiles(dir, base = "") {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkUploadFiles(full, rel)));
    } else {
      files.push(rel.replace(/\\/g, "/"));
    }
  }
  return files;
}

async function collectDatabaseSnapshot() {
  const [
    schoolSettings,
    themeSettings,
    homeSections,
    aboutPage,
    newsPosts,
    spmbLandingContent,
    paymentSettings,
    smtpSettings,
  ] = await Promise.all([
    prisma.schoolSettings.findMany(),
    prisma.themeSettings.findMany(),
    prisma.homeSection.findMany({ include: { items: true } }),
    prisma.aboutPage.findMany(),
    prisma.newsPost.findMany(),
    prisma.spmbLandingContent.findMany(),
    prisma.paymentSettings.findMany(),
    prisma.smtpSettings.findMany(),
  ]);

  return {
    schoolSettings,
    themeSettings,
    homeSections,
    aboutPage,
    newsPosts,
    spmbLandingContent,
    paymentSettings,
    smtpSettings,
  };
}

export async function createAppBackup({ includeUploads = true } = {}) {
  const database = await collectDatabaseSnapshot();
  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    database,
    uploads: [],
  };

  if (includeUploads) {
    const root = getUploadRoot();
    const relativePaths = await walkUploadFiles(root);
    let totalSize = 0;

    for (const rel of relativePaths) {
      const absolute = path.join(root, rel);
      const buffer = await readFile(absolute);
      totalSize += buffer.length;
      if (totalSize > MAX_UPLOAD_BACKUP_BYTES) {
        throw new Error("Total ukuran file upload melebihi batas backup (100 MB)");
      }
      backup.uploads.push({
        path: rel,
        data: buffer.toString("base64"),
      });
    }
  }

  return backup;
}

async function restoreUploadFiles(uploads) {
  if (!Array.isArray(uploads) || uploads.length === 0) return;

  const root = getUploadRoot();
  for (const file of uploads) {
    if (!file?.path || !file?.data) continue;
    const normalized = String(file.path).replace(/\\/g, "/");
    if (normalized.includes("..")) continue;

    const absolute = path.join(root, ...normalized.split("/"));
    if (!absolute.startsWith(root + path.sep) && absolute !== root) continue;

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, Buffer.from(file.data, "base64"));
  }
}

async function restoreDatabaseSnapshot(database) {
  await prisma.$transaction(async (tx) => {
    await tx.homeSectionItem.deleteMany();
    await tx.homeSection.deleteMany();
    await tx.newsPost.deleteMany();
    await tx.aboutPage.deleteMany();
    await tx.spmbLandingContent.deleteMany();

    for (const row of database.schoolSettings ?? []) {
      const { id, updatedAt, ...data } = row;
      await tx.schoolSettings.upsert({
        where: { id: id ?? "default" },
        update: data,
        create: { id: id ?? "default", ...data },
      });
    }

    for (const row of database.themeSettings ?? []) {
      const { id, updatedAt, ...data } = row;
      await tx.themeSettings.upsert({
        where: { id: id ?? "default" },
        update: data,
        create: { id: id ?? "default", ...data },
      });
    }

    for (const section of database.homeSections ?? []) {
      const { items, updatedAt, createdAt, ...sectionData } = section;
      const created = await tx.homeSection.create({ data: sectionData });
      if (items?.length) {
        await tx.homeSectionItem.createMany({
          data: items.map(({ id, sectionId, ...itemData }) => ({
            ...itemData,
            sectionId: created.id,
          })),
        });
      }
    }

    for (const row of database.aboutPage ?? []) {
      const { id, updatedAt, createdAt, ...data } = row;
      await tx.aboutPage.create({ data: { id, ...data } });
    }

    for (const row of database.newsPosts ?? []) {
      const { id, updatedAt, createdAt, ...data } = row;
      await tx.newsPost.create({ data: { id, ...data } });
    }

    for (const row of database.spmbLandingContent ?? []) {
      const { id, updatedAt, createdAt, ...data } = row;
      await tx.spmbLandingContent.create({ data: { id, ...data } });
    }

    for (const row of database.paymentSettings ?? []) {
      const { id, updatedAt, ...data } = row;
      await tx.paymentSettings.upsert({
        where: { id: id ?? "default" },
        update: data,
        create: { id: id ?? "default", ...data },
      });
    }

    for (const row of database.smtpSettings ?? []) {
      const { id, updatedAt, ...data } = row;
      await tx.smtpSettings.upsert({
        where: { id: id ?? "default" },
        update: data,
        create: { id: id ?? "default", ...data },
      });
    }
  });
}

export async function restoreAppBackup(backup) {
  if (!backup || backup.version !== BACKUP_VERSION) {
    throw new Error("Format backup tidak valid atau versi tidak didukung");
  }
  if (!backup.database) {
    throw new Error("Data database tidak ditemukan dalam backup");
  }

  await restoreDatabaseSnapshot(backup.database);
  await restoreUploadFiles(backup.uploads);
}
