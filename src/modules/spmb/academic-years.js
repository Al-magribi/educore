import { prisma } from "@/lib/db.js";

function mapAcademicYear(row) {
  return {
    id: row.id,
    academicYear: row.academicYear,
    isActive: row.isActive,
    periodCount: row._count?.periods ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateAcademicYearPayload(payload) {
  const academicYear = payload.academicYear?.trim();
  if (!academicYear) throw new Error("Tahun pelajaran wajib diisi");
  if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
    throw new Error("Format tahun pelajaran harus seperti 2027/2028");
  }
  return { academicYear };
}

export async function listAdmissionAcademicYears() {
  const rows = await prisma.admissionAcademicYear.findMany({
    orderBy: { academicYear: "desc" },
    include: { _count: { select: { periods: true } } },
  });
  return rows.map(mapAcademicYear);
}

export async function getActiveAdmissionAcademicYear() {
  const row = await prisma.admissionAcademicYear.findFirst({
    where: { isActive: true },
    include: { _count: { select: { periods: true } } },
  });
  return row ? mapAcademicYear(row) : null;
}

export async function getAdmissionAcademicYear(id) {
  const row = await prisma.admissionAcademicYear.findUnique({
    where: { id },
    include: { _count: { select: { periods: true } } },
  });
  return row ? mapAcademicYear(row) : null;
}

export async function createAdmissionAcademicYear(payload) {
  const data = validateAcademicYearPayload(payload);

  const existing = await prisma.admissionAcademicYear.findUnique({
    where: { academicYear: data.academicYear },
  });
  if (existing) throw new Error("Tahun pelajaran sudah ada");

  const row = await prisma.admissionAcademicYear.create({
    data: { academicYear: data.academicYear, isActive: false },
    include: { _count: { select: { periods: true } } },
  });

  return mapAcademicYear(row);
}

export async function updateAdmissionAcademicYear(id, payload) {
  const existing = await prisma.admissionAcademicYear.findUnique({ where: { id } });
  if (!existing) throw new Error("Tahun pelajaran tidak ditemukan");

  const data = validateAcademicYearPayload(payload);

  const duplicate = await prisma.admissionAcademicYear.findFirst({
    where: { academicYear: data.academicYear, id: { not: id } },
  });
  if (duplicate) throw new Error("Tahun pelajaran sudah digunakan");

  const row = await prisma.admissionAcademicYear.update({
    where: { id },
    data: { academicYear: data.academicYear },
    include: { _count: { select: { periods: true } } },
  });

  await prisma.admissionPeriod.updateMany({
    where: { academicYearId: id },
    data: { academicYear: data.academicYear },
  });

  return mapAcademicYear(row);
}

export async function activateAdmissionAcademicYear(id) {
  const existing = await prisma.admissionAcademicYear.findUnique({ where: { id } });
  if (!existing) throw new Error("Tahun pelajaran tidak ditemukan");

  await prisma.$transaction([
    prisma.admissionAcademicYear.updateMany({ data: { isActive: false } }),
    prisma.admissionAcademicYear.update({ where: { id }, data: { isActive: true } }),
    prisma.admissionPeriod.updateMany({
      where: { academicYearId: { not: id } },
      data: { isActive: false },
    }),
  ]);

  const row = await prisma.admissionAcademicYear.findUnique({
    where: { id },
    include: { _count: { select: { periods: true } } },
  });

  return mapAcademicYear(row);
}

export async function deactivateAdmissionAcademicYear(id) {
  const existing = await prisma.admissionAcademicYear.findUnique({ where: { id } });
  if (!existing) throw new Error("Tahun pelajaran tidak ditemukan");

  await prisma.$transaction([
    prisma.admissionAcademicYear.update({ where: { id }, data: { isActive: false } }),
    prisma.admissionPeriod.updateMany({
      where: { academicYearId: id },
      data: { isActive: false },
    }),
  ]);

  const row = await prisma.admissionAcademicYear.findUnique({
    where: { id },
    include: { _count: { select: { periods: true } } },
  });

  return mapAcademicYear(row);
}

export async function deleteAdmissionAcademicYear(id) {
  const existing = await prisma.admissionAcademicYear.findUnique({
    where: { id },
    include: {
      periods: {
        include: { _count: { select: { applications: true } } },
      },
    },
  });

  if (!existing) throw new Error("Tahun pelajaran tidak ditemukan");

  const hasApplicants = existing.periods.some((period) => period._count.applications > 0);
  if (hasApplicants) {
    throw new Error("Tahun pelajaran tidak dapat dihapus karena sudah memiliki pendaftar");
  }

  await prisma.admissionAcademicYear.delete({ where: { id } });
}

export async function requireActiveAcademicYear() {
  const active = await getActiveAdmissionAcademicYear();
  if (!active) {
    throw new Error("Aktifkan tahun pelajaran terlebih dahulu sebelum membuat gelombang");
  }
  return active;
}
