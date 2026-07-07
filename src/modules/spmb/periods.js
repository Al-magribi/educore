import { prisma } from "@/lib/db.js";
import {
  ensureApplyToAllRowsForNewPeriod,
  resolveAllPeriodFinancialFees,
  resolvePeriodFinancialFees,
} from "@/modules/spmb/fee-items.js";
import {
  getActiveAdmissionAcademicYear,
  requireActiveAcademicYear,
} from "@/modules/spmb/academic-years.js";

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} tidak valid`);
  }
  return date;
}

function mapPeriod(row, financialFees) {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    academicYear: row.academicYear,
    name: row.name,
    opensAt: row.opensAt.toISOString(),
    closesAt: row.closesAt.toISOString(),
    isActive: row.isActive,
    financialFees,
    applicationCount: row._count?.applications ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validatePeriodPayload(payload, { partial = false } = {}) {
  const data = {};

  if (!partial || payload.name !== undefined) {
    const name = payload.name?.trim();
    if (!name) throw new Error("Nama gelombang wajib diisi");
    data.name = name;
  }

  if (!partial || payload.opensAt !== undefined) {
    data.opensAt = parseDate(payload.opensAt, "Tanggal buka");
  }

  if (!partial || payload.closesAt !== undefined) {
    data.closesAt = parseDate(payload.closesAt, "Tanggal tutup");
  }

  if (data.opensAt && data.closesAt && data.opensAt > data.closesAt) {
    throw new Error("Tanggal buka tidak boleh setelah tanggal tutup");
  }

  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  return data;
}

async function assertPeriodBelongsToActiveYear(period) {
  const activeYear = await getActiveAdmissionAcademicYear();
  if (!activeYear) {
    throw new Error("Tidak ada tahun pelajaran aktif");
  }
  if (period.academicYearId !== activeYear.id) {
    throw new Error("Gelombang hanya dapat diaktifkan pada tahun pelajaran yang sedang aktif");
  }
}

export async function listAdmissionPeriods({ academicYearId } = {}) {
  const where = academicYearId ? { academicYearId } : {};

  const rows = await prisma.admissionPeriod.findMany({
    where,
    orderBy: [{ academicYear: "desc" }, { opensAt: "asc" }],
    include: { _count: { select: { applications: true } } },
  });

  const feesByPeriod = await resolveAllPeriodFinancialFees(rows.map((row) => row.id));

  return rows.map((row) => mapPeriod(row, feesByPeriod.get(row.id)));
}

export async function getAdmissionPeriod(id) {
  const row = await prisma.admissionPeriod.findUnique({
    where: { id },
    include: { _count: { select: { applications: true } } },
  });

  if (!row) return null;

  const financialFees = await resolvePeriodFinancialFees(id);
  return mapPeriod(row, financialFees);
}

export async function createAdmissionPeriod(payload) {
  const activeYear = await requireActiveAcademicYear();
  const data = validatePeriodPayload(payload);

  if (data.isActive) {
    await assertPeriodBelongsToActiveYear({ academicYearId: activeYear.id });
    await prisma.admissionPeriod.updateMany({ data: { isActive: false } });
  }

  const row = await prisma.admissionPeriod.create({
    data: {
      academicYearId: activeYear.id,
      academicYear: activeYear.academicYear,
      name: data.name,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
      isActive: Boolean(data.isActive),
    },
    include: { _count: { select: { applications: true } } },
  });

  await ensureApplyToAllRowsForNewPeriod(row.id);

  const financialFees = await resolvePeriodFinancialFees(row.id);
  return mapPeriod(row, financialFees);
}

export async function updateAdmissionPeriod(id, payload) {
  const existing = await prisma.admissionPeriod.findUnique({ where: { id } });
  if (!existing) throw new Error("Periode tidak ditemukan");

  const data = validatePeriodPayload(payload, { partial: true });

  if (data.isActive) {
    await assertPeriodBelongsToActiveYear(existing);
    await prisma.admissionPeriod.updateMany({
      where: { id: { not: id } },
      data: { isActive: false },
    });
  }

  const row = await prisma.admissionPeriod.update({
    where: { id },
    data,
    include: { _count: { select: { applications: true } } },
  });

  const financialFees = await resolvePeriodFinancialFees(id);
  return mapPeriod(row, financialFees);
}

export async function activateAdmissionPeriod(id) {
  const existing = await prisma.admissionPeriod.findUnique({ where: { id } });
  if (!existing) throw new Error("Periode tidak ditemukan");

  await assertPeriodBelongsToActiveYear(existing);
  await prisma.admissionPeriod.updateMany({ data: { isActive: false } });

  const row = await prisma.admissionPeriod.update({
    where: { id },
    data: { isActive: true },
    include: { _count: { select: { applications: true } } },
  });

  const financialFees = await resolvePeriodFinancialFees(id);
  return mapPeriod(row, financialFees);
}

export async function deleteAdmissionPeriod(id) {
  const existing = await prisma.admissionPeriod.findUnique({
    where: { id },
    include: { _count: { select: { applications: true } } },
  });

  if (!existing) throw new Error("Periode tidak ditemukan");
  if (existing._count.applications > 0) {
    throw new Error("Periode tidak dapat dihapus karena sudah memiliki pendaftar");
  }

  await prisma.admissionPeriod.delete({ where: { id } });
}
