import { prisma } from "@/lib/db.js";

function slugifyId(label) {
  return String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function normalizeGroup(group) {
  const title = (group?.title ?? group?.name ?? "").trim();

  return {
    id: group?.id?.trim() || slugifyId(title || "grup") || "grup",
    title: title || "Grup",
    description: typeof group?.description === "string" ? group.description.trim() : "",
    fields: Array.isArray(group?.fields) ? group.fields : [],
  };
}

function normalizeFormGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map(normalizeGroup);
}

export function normalizeFormSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return { meta: { name: "", description: "" }, groups: [] };
  }

  if (Array.isArray(schema.groups)) {
    return {
      meta: {
        name: schema.meta?.name ?? "",
        description: schema.meta?.description ?? "",
      },
      groups: normalizeFormGroups(schema.groups),
    };
  }

  if (Array.isArray(schema.fields)) {
    return {
      meta: {
        name: schema.meta?.name ?? "",
        description: schema.meta?.description ?? "",
      },
      groups: normalizeFormGroups([
        { id: "default", title: schema.meta?.groupTitle ?? "Umum", description: "", fields: schema.fields },
      ]),
    };
  }

  return { meta: { name: "", description: "" }, groups: [] };
}

export function validateFormSchema(schema) {
  const normalized = normalizeFormSchema(schema);

  if (!normalized.groups.length) {
    throw new Error("Minimal satu grup diperlukan");
  }

  const groupIds = new Set();
  const fieldIds = new Set();

  for (const group of normalized.groups) {
    const groupId = group.id?.trim();
    const groupTitle = group.title?.trim();

    if (!groupId) throw new Error("Setiap grup wajib memiliki ID");
    if (groupIds.has(groupId)) throw new Error(`ID grup duplikat: ${groupId}`);
    groupIds.add(groupId);

    if (!groupTitle) throw new Error("Nama grup wajib diisi");

    for (const field of group.fields ?? []) {
      const fieldId = field.id?.trim();
      const fieldLabel = field.label?.trim();

      if (!fieldId) throw new Error("Setiap field wajib memiliki ID");
      if (fieldIds.has(fieldId)) throw new Error(`ID field duplikat: ${fieldId}`);
      fieldIds.add(fieldId);

      if (!fieldLabel) throw new Error("Label field wajib diisi");
      if (!field.type) throw new Error(`Field "${fieldId}" wajib memiliki tipe`);
    }
  }

  return normalized;
}

function mapForm(row) {
  const schema = normalizeFormSchema(row.schema);

  return {
    id: row.id,
    name: row.name,
    version: row.version,
    isActive: row.isActive,
    periodId: row.periodId,
    periodName: row.period?.name ?? null,
    academicYear: row.period?.academicYear ?? null,
    schema,
    fieldCount: schema.groups.reduce((sum, group) => sum + (group.fields?.length ?? 0), 0),
    groupCount: schema.groups.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getActiveAdmissionPeriod() {
  return prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
  });
}

export async function listFormDefinitions() {
  const rows = await prisma.formDefinition.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: {
      period: { select: { name: true, academicYear: true } },
    },
  });

  return rows.map(mapForm);
}

export async function getFormDefinition(id) {
  const row = await prisma.formDefinition.findUnique({
    where: { id },
    include: {
      period: { select: { name: true, academicYear: true } },
    },
  });

  if (!row) return null;
  return mapForm(row);
}

export async function createFormDefinition(payload) {
  const name = payload.name?.trim() || payload.meta?.name?.trim();
  if (!name) throw new Error("Nama formulir wajib diisi");

  const schema = validateFormSchema({
    meta: {
      name,
      description: payload.meta?.description?.trim() ?? "",
    },
    groups: payload.groups ?? [],
  });

  const period = await getActiveAdmissionPeriod();
  if (!period) {
    throw new Error("Tidak ada periode SPMB aktif. Atur periode terlebih dahulu.");
  }

  const totalForms = await prisma.formDefinition.count();
  const isActive = totalForms === 0 ? true : Boolean(payload.isActive);

  if (isActive) {
    await prisma.formDefinition.updateMany({ data: { isActive: false } });
  }

  const row = await prisma.formDefinition.create({
    data: {
      periodId: period.id,
      name,
      version: 1,
      isActive,
      schema,
    },
    include: {
      period: { select: { name: true, academicYear: true } },
    },
  });

  return mapForm(row);
}

export async function updateFormDefinition(id, payload) {
  const existing = await prisma.formDefinition.findUnique({ where: { id } });
  if (!existing) throw new Error("Formulir tidak ditemukan");

  const name = payload.name?.trim() || payload.meta?.name?.trim() || existing.name;
  const schema = validateFormSchema({
    meta: {
      name,
      description: payload.meta?.description?.trim() ?? normalizeFormSchema(existing.schema).meta.description,
    },
    groups: payload.groups ?? normalizeFormSchema(existing.schema).groups,
  });

  const row = await prisma.formDefinition.update({
    where: { id },
    data: {
      name,
      version: existing.version + 1,
      schema,
    },
    include: {
      period: { select: { name: true, academicYear: true } },
    },
  });

  return mapForm(row);
}

export async function deleteFormDefinition(id) {
  const existing = await prisma.formDefinition.findUnique({ where: { id } });
  if (!existing) throw new Error("Formulir tidak ditemukan");

  await prisma.formDefinition.delete({ where: { id } });
}

export async function activateFormDefinition(id) {
  const existing = await prisma.formDefinition.findUnique({ where: { id } });
  if (!existing) throw new Error("Formulir tidak ditemukan");

  await prisma.$transaction([
    prisma.formDefinition.updateMany({ data: { isActive: false } }),
    prisma.formDefinition.update({ where: { id }, data: { isActive: true } }),
  ]);

  return getFormDefinition(id);
}

export async function getActiveFormDefinition() {
  const row = await prisma.formDefinition.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    include: {
      period: { select: { name: true, academicYear: true } },
    },
  });

  if (!row) return null;
  return mapForm(row);
}
