import { prisma } from "@/lib/db.js";
import {
  calculateFeeTotal,
  FEE_FREQUENCIES,
  normalizeFinancialFees,
} from "@/modules/spmb/period-fees.js";

function normalizeAmount(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function mapFeeItem(row) {
  const periodAmounts = (row.periodFees ?? []).map((entry) => ({
    periodId: entry.periodId,
    amount: entry.amount,
    period: entry.period
      ? {
          id: entry.period.id,
          name: entry.period.name,
          academicYear: entry.period.academicYear,
        }
      : undefined,
  }));

  return {
    id: row.id,
    label: row.label,
    frequency: FEE_FREQUENCIES.includes(row.frequency) ? row.frequency : "once",
    applyToAll: row.applyToAll,
    sortOrder: row.sortOrder,
    periodAmounts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validatePeriodAmounts(periodAmounts, applyToAll) {
  if (!Array.isArray(periodAmounts)) {
    throw new Error("Data biaya per periode tidak valid");
  }

  const normalized = periodAmounts.map((entry) => {
    const periodId = entry?.periodId?.trim();
    if (!periodId) throw new Error("Periode wajib dipilih untuk setiap biaya");
    return {
      periodId,
      amount: normalizeAmount(entry.amount),
    };
  });

  if (!applyToAll && normalized.length === 0) {
    throw new Error("Pilih minimal satu periode untuk item ini");
  }

  return normalized;
}

async function syncApplyToAllPeriodRows(itemId, periodAmounts) {
  const amountByPeriod = new Map(periodAmounts.map((entry) => [entry.periodId, entry.amount]));
  const periods = await prisma.admissionPeriod.findMany({ select: { id: true } });

  if (periods.length === 0) return;

  await prisma.$transaction(
    periods.map((period) =>
      prisma.financialFeeItemPeriod.upsert({
        where: {
          itemId_periodId: { itemId, periodId: period.id },
        },
        create: {
          itemId,
          periodId: period.id,
          amount: amountByPeriod.get(period.id) ?? 0,
        },
        update: {
          amount: amountByPeriod.has(period.id) ? amountByPeriod.get(period.id) : undefined,
        },
      })
    )
  );
}

async function syncSelectedPeriodRows(itemId, periodAmounts) {
  const desiredPeriodIds = new Set(periodAmounts.map((entry) => entry.periodId));

  await prisma.financialFeeItemPeriod.deleteMany({
    where: {
      itemId,
      periodId: { notIn: [...desiredPeriodIds] },
    },
  });

  await prisma.$transaction(
    periodAmounts.map((entry) =>
      prisma.financialFeeItemPeriod.upsert({
        where: {
          itemId_periodId: { itemId, periodId: entry.periodId },
        },
        create: {
          itemId,
          periodId: entry.periodId,
          amount: entry.amount,
        },
        update: {
          amount: entry.amount,
        },
      })
    )
  );
}

async function ensureApplyToAllRowsForNewPeriod(periodId) {
  const applyToAllItems = await prisma.financialFeeItem.findMany({
    where: { applyToAll: true },
    select: { id: true },
  });

  if (applyToAllItems.length === 0) return;

  await prisma.$transaction(
    applyToAllItems.map((item) =>
      prisma.financialFeeItemPeriod.upsert({
        where: {
          itemId_periodId: { itemId: item.id, periodId },
        },
        create: {
          itemId: item.id,
          periodId,
          amount: 0,
        },
        update: {},
      })
    )
  );
}

export async function listFinancialFeeItems() {
  const rows = await prisma.financialFeeItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      periodFees: {
        include: {
          period: {
            select: { id: true, name: true, academicYear: true },
          },
        },
      },
    },
  });

  return rows.map(mapFeeItem);
}

export async function getFinancialFeeItem(id) {
  const row = await prisma.financialFeeItem.findUnique({
    where: { id },
    include: {
      periodFees: {
        include: {
          period: {
            select: { id: true, name: true, academicYear: true },
          },
        },
      },
    },
  });

  if (!row) return null;
  return mapFeeItem(row);
}

export async function createFinancialFeeItem(payload) {
  const label = payload.label?.trim();
  if (!label) throw new Error("Nama persyaratan wajib diisi");

  const frequency = FEE_FREQUENCIES.includes(payload.frequency) ? payload.frequency : "once";
  const applyToAll = payload.applyToAll !== false;
  const periodAmounts = validatePeriodAmounts(payload.periodAmounts ?? [], applyToAll);

  const sortOrder =
    typeof payload.sortOrder === "number"
      ? payload.sortOrder
      : await prisma.financialFeeItem.count();

  const row = await prisma.financialFeeItem.create({
    data: {
      label,
      frequency,
      applyToAll,
      sortOrder,
    },
  });

  if (applyToAll) {
    await syncApplyToAllPeriodRows(row.id, periodAmounts);
  } else {
    await syncSelectedPeriodRows(row.id, periodAmounts);
  }

  return getFinancialFeeItem(row.id);
}

export async function updateFinancialFeeItem(id, payload) {
  const existing = await prisma.financialFeeItem.findUnique({ where: { id } });
  if (!existing) throw new Error("Item persyaratan tidak ditemukan");

  const data = {};

  if (payload.label !== undefined) {
    const label = payload.label?.trim();
    if (!label) throw new Error("Nama persyaratan wajib diisi");
    data.label = label;
  }

  if (payload.frequency !== undefined) {
    data.frequency = FEE_FREQUENCIES.includes(payload.frequency) ? payload.frequency : "once";
  }

  if (payload.applyToAll !== undefined) {
    data.applyToAll = Boolean(payload.applyToAll);
  }

  if (payload.sortOrder !== undefined) {
    data.sortOrder = Number(payload.sortOrder) || 0;
  }

  if (Object.keys(data).length > 0) {
    await prisma.financialFeeItem.update({ where: { id }, data });
  }

  const applyToAll = payload.applyToAll ?? existing.applyToAll;

  if (payload.periodAmounts !== undefined) {
    const periodAmounts = validatePeriodAmounts(payload.periodAmounts, applyToAll);

    if (applyToAll) {
      await syncApplyToAllPeriodRows(id, periodAmounts);
    } else {
      await syncSelectedPeriodRows(id, periodAmounts);
    }
  } else if (payload.applyToAll !== undefined && payload.applyToAll !== existing.applyToAll) {
    const currentAmounts = await prisma.financialFeeItemPeriod.findMany({
      where: { itemId: id },
      select: { periodId: true, amount: true },
    });

    if (applyToAll) {
      await syncApplyToAllPeriodRows(id, currentAmounts);
    } else {
      await syncSelectedPeriodRows(
        id,
        currentAmounts.filter((entry) => entry.amount > 0)
      );
    }
  }

  return getFinancialFeeItem(id);
}

export async function deleteFinancialFeeItem(id) {
  const existing = await prisma.financialFeeItem.findUnique({ where: { id } });
  if (!existing) throw new Error("Item persyaratan tidak ditemukan");

  await prisma.financialFeeItem.delete({ where: { id } });
}

export async function resolvePeriodFinancialFees(periodId) {
  const items = await prisma.financialFeeItem.findMany({
    where: {
      OR: [{ applyToAll: true }, { periodFees: { some: { periodId } } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      periodFees: {
        where: { periodId },
        select: { amount: true },
      },
    },
  });

  const resolvedItems = items
    .filter((item) => item.applyToAll || item.periodFees.length > 0)
    .map((item) => ({
      id: item.id,
      label: item.label,
      frequency: FEE_FREQUENCIES.includes(item.frequency) ? item.frequency : "once",
      amount: item.periodFees[0]?.amount ?? 0,
    }));

  return normalizeFinancialFees({ items: resolvedItems });
}

export async function resolveAllPeriodFinancialFees(periodIds) {
  if (periodIds.length === 0) return new Map();

  const items = await prisma.financialFeeItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      periodFees: {
        where: { periodId: { in: periodIds } },
        select: { periodId: true, amount: true },
      },
    },
  });

  const feesByPeriod = new Map(periodIds.map((id) => [id, []]));

  for (const item of items) {
    const feeItemBase = {
      id: item.id,
      label: item.label,
      frequency: FEE_FREQUENCIES.includes(item.frequency) ? item.frequency : "once",
    };

    if (item.applyToAll) {
      for (const periodId of periodIds) {
        const amountEntry = item.periodFees.find((entry) => entry.periodId === periodId);
        feesByPeriod.get(periodId).push({
          ...feeItemBase,
          amount: amountEntry?.amount ?? 0,
        });
      }
      continue;
    }

    for (const amountEntry of item.periodFees) {
      feesByPeriod.get(amountEntry.periodId)?.push({
        ...feeItemBase,
        amount: amountEntry.amount,
      });
    }
  }

  return new Map(
    [...feesByPeriod.entries()].map(([periodId, feeItems]) => [
      periodId,
      normalizeFinancialFees({ items: feeItems }),
    ])
  );
}

export { ensureApplyToAllRowsForNewPeriod, calculateFeeTotal };
