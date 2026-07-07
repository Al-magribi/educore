import { prisma } from "@/lib/db.js";
import { APPLICATION_STATUS, PAYMENT_CATEGORY, PAYMENT_STATUS } from "@/lib/constants.js";
import { resolvePeriodFinancialFees } from "@/modules/spmb/fee-items.js";
import { buildWaveFeeSummary, isWaveEnrollmentComplete } from "./wave-fees.js";

const PAID_APPLICATION_STATUSES = new Set([
  APPLICATION_STATUS.PAID,
  APPLICATION_STATUS.FORM_IN_PROGRESS,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.REJECTED,
]);

const APPLICATION_WITH_PAYMENTS_SELECT = {
  id: true,
  status: true,
  periodId: true,
  payments: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      amount: true,
      status: true,
      method: true,
      proofUrl: true,
      externalId: true,
      paidAt: true,
      createdAt: true,
      metadata: true,
    },
  },
  period: {
    select: {
      id: true,
      name: true,
      academicYear: true,
      opensAt: true,
      closesAt: true,
    },
  },
};

function getLatestRegistrationPayment(payments) {
  return (payments ?? []).find((payment) => payment.category === PAYMENT_CATEGORY.REGISTRATION) ?? null;
}

function getWavePayments(payments) {
  return (payments ?? []).filter((payment) => payment.category === PAYMENT_CATEGORY.WAVE_FEE);
}

export function isRegistrationPaidForApplication(application) {
  if (!application) return false;

  const registrationPayment = getLatestRegistrationPayment(application.payments);
  if (registrationPayment?.status === PAYMENT_STATUS.PAID) return true;

  return PAID_APPLICATION_STATUSES.has(application.status);
}

async function loadWaveSummary(periodId, wavePayments) {
  const feeItems = await resolvePeriodFinancialFees(periodId);
  return buildWaveFeeSummary(feeItems, wavePayments);
}

async function findEligiblePreviousApplication(userId, activePeriod) {
  const now = new Date();

  const previousApplications = await prisma.application.findMany({
    where: {
      userId,
      periodId: { not: activePeriod.id },
      period: {
        academicYear: activePeriod.academicYear,
        opensAt: { lt: activePeriod.opensAt },
        closesAt: { lt: now },
      },
    },
    orderBy: { period: { opensAt: "desc" } },
    select: APPLICATION_WITH_PAYMENTS_SELECT,
  });

  for (const application of previousApplications) {
    if (!isRegistrationPaidForApplication(application)) continue;

    const wavePayments = getWavePayments(application.payments);
    const waveSummary = await loadWaveSummary(application.periodId, wavePayments);
    const enrolled = isWaveEnrollmentComplete(
      waveSummary,
      wavePayments,
      application.period.closesAt
    );

    if (!enrolled) {
      return application;
    }
  }

  return null;
}

function resolveCarryOverStatus(previousApplication) {
  if (PAID_APPLICATION_STATUSES.has(previousApplication.status)) {
    return previousApplication.status;
  }

  if (isRegistrationPaidForApplication(previousApplication)) {
    return APPLICATION_STATUS.PAID;
  }

  return APPLICATION_STATUS.PENDING_PAYMENT;
}

/**
 * Pastikan pendaftar punya application pada gelombang aktif.
 * Jika gelombang sebelumnya sudah tutup dan pembayaran gelombang belum lunas,
 * otomatis buat pendaftaran di gelombang aktif (tanpa mengulang biaya formulir).
 */
export async function ensureApplicationForActivePeriod(userId, activePeriod) {
  const existing = await prisma.application.findUnique({
    where: {
      userId_periodId: { userId, periodId: activePeriod.id },
    },
    select: APPLICATION_WITH_PAYMENTS_SELECT,
  });

  if (existing) {
    return { application: existing, migratedFrom: null };
  }

  const previousApplication = await findEligiblePreviousApplication(userId, activePeriod);
  if (!previousApplication) {
    return { application: null, migratedFrom: null, needsCreate: true };
  }

  const created = await prisma.application.create({
    data: {
      userId,
      periodId: activePeriod.id,
      status: resolveCarryOverStatus(previousApplication),
    },
    select: APPLICATION_WITH_PAYMENTS_SELECT,
  });

  return {
    application: created,
    migratedFrom: {
      periodId: previousApplication.period.id,
      periodName: previousApplication.period.name,
    },
  };
}

export async function findRegistrationSourceApplication(userId, activePeriod, currentApplication) {
  const currentPayment = getLatestRegistrationPayment(currentApplication?.payments);

  if (currentPayment) {
    return { application: currentApplication, payment: currentPayment };
  }

  if (isRegistrationPaidForApplication(currentApplication)) {
    return {
      application: currentApplication,
      payment: null,
    };
  }

  const paidApplication = await prisma.application.findFirst({
    where: {
      userId,
      period: { academicYear: activePeriod.academicYear },
      OR: [
        { status: { in: [...PAID_APPLICATION_STATUSES] } },
        {
          payments: {
            some: {
              category: PAYMENT_CATEGORY.REGISTRATION,
              status: PAYMENT_STATUS.PAID,
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: APPLICATION_WITH_PAYMENTS_SELECT,
  });

  if (!paidApplication) {
    return { application: currentApplication, payment: null };
  }

  return {
    application: paidApplication,
    payment: getLatestRegistrationPayment(paidApplication.payments),
  };
}

export async function createApplicationIfNeeded(userId, periodId) {
  const existing = await prisma.application.findUnique({
    where: { userId_periodId: { userId, periodId } },
    select: APPLICATION_WITH_PAYMENTS_SELECT,
  });

  if (existing) return existing;

  return prisma.application.create({
    data: {
      userId,
      periodId,
      status: APPLICATION_STATUS.PENDING_PAYMENT,
    },
    select: APPLICATION_WITH_PAYMENTS_SELECT,
  });
}
