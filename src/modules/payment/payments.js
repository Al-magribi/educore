import { prisma } from "@/lib/db.js";
import { APPLICATION_STATUS, PAYMENT_STATUS } from "@/lib/constants.js";

const PAYMENT_STATUSES = new Set(Object.values(PAYMENT_STATUS));

function formatDateTime(value) {
  if (!value) return null;
  return value.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapPayment(row) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    amount: row.amount,
    status: row.status,
    method: row.method,
    externalId: row.externalId,
    proofUrl: row.proofUrl,
    paidAt: formatDateTime(row.paidAt),
    createdAt: formatDateTime(row.createdAt),
    applicant: {
      name: row.application.user.name,
      email: row.application.user.email,
      phone: row.application.user.phone ?? "—",
    },
    applicationStatus: row.application.status,
  };
}

export async function listPayments({ page = 1, limit = 10, status } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const where = status && status !== "all" ? { status } : undefined;

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
      select: {
        id: true,
        applicationId: true,
        amount: true,
        status: true,
        method: true,
        externalId: true,
        proofUrl: true,
        paidAt: true,
        createdAt: true,
        application: {
          select: {
            status: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: rows.map(mapPayment),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function updatePaymentStatus(id, status, { allowManualManagement = false } = {}) {
  if (!allowManualManagement) {
    throw new Error("Perubahan status manual tidak tersedia saat Midtrans aktif");
  }

  if (!PAYMENT_STATUSES.has(status)) {
    throw new Error("Status pembayaran tidak valid");
  }

  const existing = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      method: true,
      applicationId: true,
      application: { select: { status: true } },
    },
  });

  if (!existing) throw new Error("Pembayaran tidak ditemukan");
  if (existing.method !== "manual") {
    throw new Error("Hanya pembayaran manual yang dapat diubah statusnya");
  }

  const paidAt = status === PAYMENT_STATUS.PAID ? new Date() : null;
  const prePaymentApplicationStatuses = new Set([
    APPLICATION_STATUS.DRAFT,
    APPLICATION_STATUS.PENDING_PAYMENT,
  ]);

  const row = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id },
      data: {
        status,
        paidAt: status === PAYMENT_STATUS.PAID ? paidAt : null,
      },
      select: {
        id: true,
        applicationId: true,
        amount: true,
        status: true,
        method: true,
        externalId: true,
        proofUrl: true,
        paidAt: true,
        createdAt: true,
        application: {
          select: {
            status: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (
      status === PAYMENT_STATUS.PAID &&
      prePaymentApplicationStatuses.has(existing.application.status)
    ) {
      await tx.application.update({
        where: { id: existing.applicationId },
        data: { status: APPLICATION_STATUS.PAID },
      });
      payment.application.status = APPLICATION_STATUS.PAID;
    }

    if (
      status !== PAYMENT_STATUS.PAID &&
      existing.application.status === APPLICATION_STATUS.PAID
    ) {
      await tx.application.update({
        where: { id: existing.applicationId },
        data: { status: APPLICATION_STATUS.PENDING_PAYMENT },
      });
      payment.application.status = APPLICATION_STATUS.PENDING_PAYMENT;
    }

    return payment;
  });

  return mapPayment(row);
}

export async function deletePayment(id) {
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) throw new Error("Pembayaran tidak ditemukan");

  await prisma.payment.delete({ where: { id } });
  return { id };
}
