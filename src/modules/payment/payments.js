import { prisma } from "@/lib/db.js";
import {
  APPLICATION_STATUS,
  PAYMENT_CATEGORY,
  PAYMENT_STATUS,
} from "@/lib/constants.js";
import { buildWaveFeeSummary, resolveWaveEnrollmentStatus } from "./wave-fees.js";
import { resolvePeriodFinancialFees } from "@/modules/spmb/fee-items.js";
import {
  deletePhysicalUploads,
  deleteRegistrationPaymentSideEffects,
} from "@/modules/spmb/application-cleanup.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

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

const categoryLabels = {
  registration: "Pendaftaran",
  wave_fee: "Gelombang Aktif",
};

const methodLabels = {
  manual: "Transfer manual",
  midtrans: "Midtrans",
  cash: "Tunai",
};

function resolveCategoryLabel(row, waveSummary) {
  if (row.category === PAYMENT_CATEGORY.REGISTRATION) {
    return categoryLabels.registration;
  }

  if (row.category === PAYMENT_CATEGORY.WAVE_FEE) {
    if (waveSummary?.isFullyPaid && row.application?.period?.name) {
      return row.application.period.name;
    }
    return "Gelombang";
  }

  return categoryLabels[row.category] ?? row.category;
}

function mapPayment(row, waveSummaryByApplication = new Map()) {
  const waveSummary = waveSummaryByApplication.get(row.applicationId);
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : null;

  return {
    id: row.id,
    applicationId: row.applicationId,
    category: row.category,
    categoryLabel: resolveCategoryLabel(row, waveSummary),
    amount: row.amount,
    status: row.status,
    method: row.method,
    methodLabel: methodLabels[row.method] ?? row.method,
    externalId: row.externalId,
    proofUrl: row.proofUrl,
    paidAt: formatDateTime(row.paidAt),
    createdAt: formatDateTime(row.createdAt),
    invoiceNumber: row.invoiceNumber,
    invoiceIssuedAt: formatDateTime(row.invoiceIssuedAt),
    metadata,
    applicant: {
      name: row.application.user.name,
      email: row.application.user.email,
      phone: row.application.user.phone ?? "—",
    },
    applicationStatus: row.application.status,
    period: row.application.period
      ? {
          id: row.application.period.id,
          name: row.application.period.name,
          academicYear: row.application.period.academicYear,
        }
      : null,
    waveProgress: waveSummary
      ? {
          paidAmount: waveSummary.paidAmount,
          totalAmount: waveSummary.totalAmount,
          remainingAmount: waveSummary.remainingAmount,
          isFullyPaid: waveSummary.isFullyPaid,
          isEnrolled: waveSummary.isEnrolled ?? false,
          enrollmentStatusLabel: waveSummary.enrollmentStatusLabel ?? null,
          paidCount: waveSummary.paidCount,
          totalCount: waveSummary.totalCount,
        }
      : null,
  };
}

async function getActivePeriod() {
  return prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
    select: { id: true, name: true, academicYear: true },
  });
}

async function buildWaveSummaryMap(applicationIds, periodId) {
  if (applicationIds.length === 0 || !periodId) return new Map();

  const feeItems = await resolvePeriodFinancialFees(periodId);
  const period = await prisma.admissionPeriod.findUnique({
    where: { id: periodId },
    select: { closesAt: true },
  });
  const wavePayments = await prisma.payment.findMany({
    where: {
      applicationId: { in: applicationIds },
      category: PAYMENT_CATEGORY.WAVE_FEE,
    },
    select: {
      applicationId: true,
      status: true,
      paidAt: true,
      metadata: true,
    },
  });

  const paymentsByApplication = new Map();
  for (const payment of wavePayments) {
    if (!paymentsByApplication.has(payment.applicationId)) {
      paymentsByApplication.set(payment.applicationId, []);
    }
    paymentsByApplication.get(payment.applicationId).push(payment);
  }

  const summaryMap = new Map();
  for (const applicationId of applicationIds) {
    const payments = paymentsByApplication.get(applicationId) ?? [];
    const waveSummary = buildWaveFeeSummary(feeItems, payments);
    const enrollment = resolveWaveEnrollmentStatus(waveSummary, payments, period?.closesAt);
    summaryMap.set(applicationId, {
      ...waveSummary,
      isEnrolled: enrollment.status === "enrolled",
      enrollmentStatus: enrollment.status,
      enrollmentStatusLabel: enrollment.statusLabel,
    });
  }

  return summaryMap;
}

export async function listPayments({
  page = 1,
  limit = 10,
  status,
  category,
  periodId,
  wavePaidOnly = false,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const activePeriod = periodId ? null : await getActivePeriod();
  const resolvedPeriodId = periodId || activePeriod?.id;

  const where = {};
  if (status && status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;
  if (resolvedPeriodId) {
    where.application = { periodId: resolvedPeriodId };
  }

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
      select: {
        id: true,
        applicationId: true,
        category: true,
        amount: true,
        status: true,
        method: true,
        externalId: true,
        proofUrl: true,
        paidAt: true,
        createdAt: true,
        invoiceNumber: true,
        invoiceIssuedAt: true,
        metadata: true,
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
            period: {
              select: {
                id: true,
                name: true,
                academicYear: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  const applicationIds = [...new Set(rows.map((row) => row.applicationId))];
  const waveSummaryMap = await buildWaveSummaryMap(applicationIds, resolvedPeriodId);

  let items = rows.map((row) => mapPayment(row, waveSummaryMap));

  if (wavePaidOnly) {
    items = items.filter(
      (item) =>
        item.category === PAYMENT_CATEGORY.WAVE_FEE &&
        item.status === PAYMENT_STATUS.PAID &&
        item.waveProgress
    );
  }

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: wavePaidOnly ? items.length : total,
      totalPages: Math.max(1, Math.ceil((wavePaidOnly ? items.length : total) / safeLimit)),
    },
    activePeriod: activePeriod
      ? {
          id: activePeriod.id,
          name: activePeriod.name,
          academicYear: activePeriod.academicYear,
        }
      : null,
  };
}

export async function listWaveFeeApplicants({ periodId } = {}) {
  const activePeriod = periodId ? null : await getActivePeriod();
  const resolvedPeriodId = periodId || activePeriod?.id;
  if (!resolvedPeriodId) {
    return { applicants: [], activePeriod: null };
  }

  const applications = await prisma.application.findMany({
    where: { periodId: resolvedPeriodId },
    select: {
      id: true,
      status: true,
      user: {
        select: { name: true, email: true, phone: true },
      },
      payments: {
        where: { category: PAYMENT_CATEGORY.WAVE_FEE },
        select: {
          id: true,
          status: true,
          amount: true,
          method: true,
          paidAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const [feeItems, period] = await Promise.all([
    resolvePeriodFinancialFees(resolvedPeriodId),
    prisma.admissionPeriod.findUnique({
      where: { id: resolvedPeriodId },
      select: { id: true, name: true, academicYear: true, closesAt: true },
    }),
  ]);

  const applicants = applications
    .map((application) => {
      const waveSummary = buildWaveFeeSummary(feeItems, application.payments);
      if (waveSummary.paidCount === 0) return null;

      const enrollment = resolveWaveEnrollmentStatus(
        waveSummary,
        application.payments,
        period?.closesAt
      );

      return {
        applicationId: application.id,
        applicant: {
          name: application.user.name,
          email: application.user.email,
          phone: application.user.phone ?? "—",
        },
        waveProgress: {
          paidAmount: waveSummary.paidAmount,
          totalAmount: waveSummary.totalAmount,
          remainingAmount: waveSummary.remainingAmount,
          isFullyPaid: waveSummary.isFullyPaid,
          isEnrolled: enrollment.status === "enrolled",
          paidCount: waveSummary.paidCount,
          totalCount: waveSummary.totalCount,
          statusLabel: enrollment.statusLabel,
          enrollmentStatus: enrollment.status,
        },
        payments: application.payments
          .filter((payment) => payment.status === PAYMENT_STATUS.PAID)
          .map((payment) => {
            const metadata =
              payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
            const feeItemsPaid = Array.isArray(metadata.feeItems) ? metadata.feeItems : [];
            const installmentPrefix =
              metadata.paymentMode === "installment" ? "Cicilan — " : "";

            return {
              id: payment.id,
              amount: payment.amount,
              method: payment.method,
              methodLabel: methodLabels[payment.method] ?? payment.method,
              paidAt: formatDateTime(payment.paidAt),
              lineItems: feeItemsPaid.map((item) => ({
                label: `${installmentPrefix}${item.label ?? "Biaya"}`,
                amount: item.amount,
              })),
            };
          }),
      };
    })
    .filter(Boolean);

  return {
    applicants,
    activePeriod: period
      ? {
          id: period.id,
          name: period.name,
          academicYear: period.academicYear,
        }
      : null,
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
      category: true,
      applicationId: true,
      application: { select: { status: true } },
    },
  });

  if (!existing) throw new Error("Pembayaran tidak ditemukan");
  if (existing.method !== "manual" && existing.method !== "cash") {
    throw new Error("Hanya pembayaran manual/tunai yang dapat diubah statusnya");
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
        category: true,
        amount: true,
        status: true,
        method: true,
        externalId: true,
        proofUrl: true,
        paidAt: true,
        createdAt: true,
        invoiceNumber: true,
        invoiceIssuedAt: true,
        metadata: true,
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
            period: {
              select: {
                id: true,
                name: true,
                academicYear: true,
              },
            },
          },
        },
      },
    });

    if (
      status === PAYMENT_STATUS.PAID &&
      payment.category === PAYMENT_CATEGORY.REGISTRATION &&
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
      payment.category === PAYMENT_CATEGORY.REGISTRATION &&
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

  const waveSummaryMap = await buildWaveSummaryMap(
    [row.applicationId],
    row.application.period?.id
  );

  return mapPayment(row, waveSummaryMap);
}

export async function deletePayment(id) {
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      applicationId: true,
      category: true,
      proofUrl: true,
    },
  });
  if (!existing) throw new Error("Pembayaran tidak ditemukan");

  const proofUrl = isAppUploadUrl(existing.proofUrl) ? existing.proofUrl.trim() : null;
  let formUploadUrls = [];

  await prisma.$transaction(async (tx) => {
    if (existing.category === PAYMENT_CATEGORY.REGISTRATION) {
      formUploadUrls = await deleteRegistrationPaymentSideEffects(existing, tx);
    }

    await tx.payment.delete({ where: { id } });
  });

  await deletePhysicalUploads([...(proofUrl ? [proofUrl] : []), ...formUploadUrls]);

  return { id };
}
