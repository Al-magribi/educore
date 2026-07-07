import { prisma } from "@/lib/db.js";
import {
  APPLICATION_STATUS,
  PAYMENT_CATEGORY,
  PAYMENT_STATUS,
} from "@/lib/constants.js";
import { getPublicPaymentSettings, getPaymentSettingsForServer } from "./settings.js";
import {
  buildWaveFeeSummary,
  getActivePeriodWaveFees,
  isPeriodPaymentOpen,
  resolveWaveEnrollmentStatus,
  validateSelectedFeeItems,
} from "./wave-fees.js";
import {
  createApplicationIfNeeded,
  ensureApplicationForActivePeriod,
  findRegistrationSourceApplication,
  isRegistrationPaidForApplication,
} from "./period-migration.js";
import {
  buildOrderId,
  createSnapTransaction,
  getMidtransSnapScriptUrl,
  getMidtransTransactionStatus,
  parseOrderId,
} from "./midtrans.js";

const PAID_APPLICATION_STATUSES = new Set([
  APPLICATION_STATUS.PAID,
  APPLICATION_STATUS.FORM_IN_PROGRESS,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.REJECTED,
]);

const PAYMENT_SELECT = {
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
};

function formatDateTime(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mapPayment(row) {
  if (!row) return null;
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : null;
  return {
    id: row.id,
    category: row.category,
    amount: row.amount,
    status: row.status,
    method: row.method,
    proofUrl: row.proofUrl,
    externalId: row.externalId,
    paidAt: formatDateTime(row.paidAt),
    createdAt: formatDateTime(row.createdAt),
    metadata,
  };
}

async function getActivePeriod() {
  return prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
    select: {
      id: true,
      name: true,
      academicYear: true,
      opensAt: true,
      closesAt: true,
    },
  });
}

async function getUserApplication(userId, periodId) {
  return prisma.application.findUnique({
    where: {
      userId_periodId: { userId, periodId },
    },
    select: {
      id: true,
      status: true,
      payments: {
        orderBy: { createdAt: "desc" },
        select: PAYMENT_SELECT,
      },
    },
  });
}

async function ensureApplication(userId, periodId) {
  const existing = await getUserApplication(userId, periodId);
  if (existing) return existing;

  return prisma.application.create({
    data: {
      userId,
      periodId,
      status: APPLICATION_STATUS.PENDING_PAYMENT,
    },
    select: {
      id: true,
      status: true,
      payments: {
        orderBy: { createdAt: "desc" },
        select: PAYMENT_SELECT,
      },
    },
  });
}

function getLatestPaymentByCategory(payments, category) {
  return payments?.find((payment) => payment.category === category) ?? null;
}

function getPaymentsByCategory(payments, category) {
  return (payments ?? []).filter((payment) => payment.category === category);
}

/** Status tampilan calon siswa — mengutamakan record pembayaran terbaru per kategori. */
export function deriveApplicantPaymentState(payment, applicationStatus) {
  const paymentStatus = payment?.status ?? null;

  if (paymentStatus === PAYMENT_STATUS.PAID) {
    return { isPaid: true, isReview: false, isFailed: false, canPay: false };
  }
  if (paymentStatus === PAYMENT_STATUS.MANUAL_REVIEW) {
    return { isPaid: false, isReview: true, isFailed: false, canPay: false };
  }
  if (paymentStatus === PAYMENT_STATUS.FAILED) {
    return { isPaid: false, isReview: false, isFailed: true, canPay: true };
  }
  if (paymentStatus === PAYMENT_STATUS.PENDING) {
    return { isPaid: false, isReview: false, isFailed: false, canPay: true };
  }
  if (applicationStatus && PAID_APPLICATION_STATUSES.has(applicationStatus)) {
    return { isPaid: true, isReview: false, isFailed: false, canPay: false };
  }
  return { isPaid: false, isReview: false, isFailed: false, canPay: true };
}

function buildMethods(settings) {
  const methods = [];
  if (settings.manualEnabled) {
    methods.push({
      id: "manual",
      label: "Transfer Bank",
      description: "Transfer ke rekening sekolah lalu unggah bukti pembayaran.",
    });
  }
  if (settings.midtransEnabled && settings.midtransClientKey && settings.midtransServerKeySet) {
    methods.push({
      id: "midtrans",
      label: "Bayar Online",
      description: "Kartu kredit/debit, e-wallet, dan metode lain via Midtrans.",
    });
  }
  return methods;
}

function buildSettingsPayload(settings) {
  if (!settings) return null;
  return {
    registrationFee: settings.registrationFee,
    manualEnabled: settings.manualEnabled,
    manualInstructions: settings.manualInstructions,
    bankName: settings.bankName,
    bankAccountNumber: settings.bankAccountNumber,
    bankAccountName: settings.bankAccountName,
    midtransEnabled: settings.midtransEnabled,
    midtransClientKey: settings.midtransClientKey,
    midtransProduction: settings.midtransProduction,
    midtransServerKeySet: settings.midtransServerKeySet,
  };
}

async function resolveApplicantApplication(userId, activePeriod) {
  const migration = await ensureApplicationForActivePeriod(userId, activePeriod);

  let application = migration.application;
  if (!application && migration.needsCreate) {
    application = await createApplicationIfNeeded(userId, activePeriod.id);
  }

  if (!application) {
    throw new Error("Gagal memuat data pendaftaran");
  }

  const registrationSource = await findRegistrationSourceApplication(
    userId,
    activePeriod,
    application
  );

  return {
    application,
    migratedFrom: migration.migratedFrom,
    registrationPayment: registrationSource.payment,
    registrationApplicationStatus:
      registrationSource.application?.status ?? application.status,
  };
}

export async function getApplicantPaymentPageData(userId) {
  const [settings, activePeriod, user] = await Promise.all([
    getPublicPaymentSettings(),
    getActivePeriod(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    }),
  ]);

  const basePayload = {
    activePeriod: null,
    settings: buildSettingsPayload(settings),
    application: null,
    registrationPayment: null,
    registrationPaymentState: deriveApplicantPaymentState(null, null),
    waveFee: null,
    wavePayments: [],
    methods: [],
    midtransScriptUrl: null,
    applicant: user,
    migratedFrom: null,
  };

  if (!activePeriod) return basePayload;

  let migratedFrom = null;
  let application;
  let registrationPaymentRaw = null;
  let registrationApplicationStatus = null;

  try {
    const resolved = await resolveApplicantApplication(userId, activePeriod);
    application = resolved.application;
    migratedFrom = resolved.migratedFrom;
    registrationPaymentRaw = resolved.registrationPayment;
    registrationApplicationStatus = resolved.registrationApplicationStatus;
  } catch {
    return basePayload;
  }

  const registrationPayment = mapPayment(registrationPaymentRaw);
  const registrationPaymentState = deriveApplicantPaymentState(
    registrationPayment,
    registrationApplicationStatus ?? application.status
  );
  const wavePaymentsRaw = getPaymentsByCategory(application?.payments, PAYMENT_CATEGORY.WAVE_FEE);
  const wavePayments = wavePaymentsRaw.map(mapPayment);
  const feeItems = await getActivePeriodWaveFees(activePeriod.id);
  const waveFee = buildWaveFeeSummary(feeItems, wavePaymentsRaw);
  const enrollmentStatus = resolveWaveEnrollmentStatus(
    waveFee,
    wavePaymentsRaw,
    activePeriod.closesAt
  );
  const registrationPaid = registrationPaymentState.isPaid;
  const periodOpen = isPeriodPaymentOpen(activePeriod.closesAt);

  return {
    activePeriod: {
      id: activePeriod.id,
      name: activePeriod.name,
      academicYear: activePeriod.academicYear,
      closesAt: formatDateTime(activePeriod.closesAt),
      isOpen: periodOpen,
    },
    settings: buildSettingsPayload(settings),
    application: application
      ? {
          id: application.id,
          status: application.status,
          registrationPaid,
        }
      : null,
    registrationPayment,
    registrationPaymentState,
    waveFee: {
      ...waveFee,
      canPay: registrationPaid && !waveFee.isFullyPaid && periodOpen,
      hasPendingPayment: wavePayments.some(
        (payment) =>
          payment.status === PAYMENT_STATUS.PENDING ||
          payment.status === PAYMENT_STATUS.MANUAL_REVIEW
      ),
      isEnrolled: enrollmentStatus.status === "enrolled",
      enrollmentStatus: enrollmentStatus.status,
      enrollmentStatusLabel: enrollmentStatus.statusLabel,
    },
    wavePayments,
    methods: settings ? buildMethods(settings) : [],
    midtransScriptUrl: settings?.midtransEnabled
      ? getMidtransSnapScriptUrl(settings.midtransProduction)
      : null,
    applicant: user,
    migratedFrom,
  };
}

function assertPaymentAllowed(settings, method) {
  if (!settings) throw new Error("Pengaturan pembayaran belum dikonfigurasi");

  if (method === "manual" && !settings.manualEnabled) {
    throw new Error("Pembayaran manual tidak tersedia");
  }

  if (method === "midtrans") {
    if (!settings.midtransEnabled) throw new Error("Pembayaran online tidak tersedia");
    if (!settings.midtransServerKey) throw new Error("Midtrans belum dikonfigurasi sepenuhnya");
    if (!settings.midtransClientKey) throw new Error("Client Key Midtrans belum dikonfigurasi");
  }
}

function normalizeCategory(category) {
  return category === PAYMENT_CATEGORY.WAVE_FEE
    ? PAYMENT_CATEGORY.WAVE_FEE
    : PAYMENT_CATEGORY.REGISTRATION;
}

async function resolvePaymentContext(userId, category, feeItemIds = []) {
  const activePeriod = await getActivePeriod();
  if (!activePeriod) throw new Error("Periode pendaftaran tidak aktif");

  const [resolved, settings] = await Promise.all([
    resolveApplicantApplication(userId, activePeriod),
    getPaymentSettingsForServer(),
  ]);

  const { application, registrationPayment, registrationApplicationStatus } = resolved;
  const normalizedCategory = normalizeCategory(category);
  const latest = getLatestPaymentByCategory(application.payments, normalizedCategory);
  const wavePayments = getPaymentsByCategory(application.payments, PAYMENT_CATEGORY.WAVE_FEE);
  const feeItems = await getActivePeriodWaveFees(activePeriod.id);
  const waveSummary = buildWaveFeeSummary(feeItems, wavePayments);
  const registrationState = deriveApplicantPaymentState(
    registrationPayment ? mapPayment(registrationPayment) : null,
    registrationApplicationStatus ?? application.status
  );

  if (normalizedCategory === PAYMENT_CATEGORY.REGISTRATION) {
    if (registrationState.isPaid || isRegistrationPaidForApplication(application)) {
      throw new Error("Pembayaran pendaftaran sudah lunas");
    }
    if (registrationState.isReview) throw new Error("Bukti pembayaran sedang diverifikasi admin");

    return {
      activePeriod,
      application,
      settings,
      latestPayment: latest,
      category: normalizedCategory,
      amount: settings?.registrationFee ?? 350000,
      metadata: null,
    };
  }

  if (!registrationState.isPaid) {
    throw new Error("Selesaikan pembayaran pendaftaran terlebih dahulu");
  }
  if (!isPeriodPaymentOpen(activePeriod.closesAt)) {
    throw new Error("Batas pembayaran gelombang ini telah berakhir");
  }
  if (waveSummary.isFullyPaid) throw new Error("Semua biaya gelombang aktif sudah lunas");

  const pendingWave = wavePayments.find(
    (payment) =>
      payment.status === PAYMENT_STATUS.MANUAL_REVIEW || payment.status === PAYMENT_STATUS.PENDING
  );
  if (pendingWave) {
    throw new Error("Masih ada pembayaran gelombang yang belum selesai diverifikasi");
  }

  const selection = validateSelectedFeeItems(feeItemIds, waveSummary.remainingItems);

  return {
    activePeriod,
    application,
    settings,
    latestPayment: latest,
    category: normalizedCategory,
    amount: selection.amount,
    metadata: {
      feeItemIds: selection.feeItemIds,
      feeItems: selection.feeItems.map((item) => ({
        id: item.id,
        label: item.label,
        amount: item.amount,
      })),
      paymentMode: selection.paymentMode,
    },
  };
}

export async function submitManualPayment(userId, proofUrl, { category, feeItemIds } = {}) {
  if (!proofUrl?.trim()) throw new Error("Bukti pembayaran wajib diunggah");

  const ctx = await resolvePaymentContext(userId, category, feeItemIds);
  assertPaymentAllowed(ctx.settings, "manual");

  if (
    ctx.latestPayment?.category === ctx.category &&
    ctx.latestPayment.status === PAYMENT_STATUS.MANUAL_REVIEW
  ) {
    throw new Error("Bukti pembayaran sedang diverifikasi admin");
  }

  if (
    ctx.latestPayment?.method === "midtrans" &&
    ctx.latestPayment.status === PAYMENT_STATUS.PENDING
  ) {
    throw new Error("Anda memiliki transaksi online yang belum selesai");
  }

  const payment = await prisma.$transaction(async (tx) => {
    let row;

    if (
      ctx.latestPayment?.method === "manual" &&
      ctx.latestPayment.status === PAYMENT_STATUS.PENDING &&
      ctx.latestPayment.category === ctx.category
    ) {
      row = await tx.payment.update({
        where: { id: ctx.latestPayment.id },
        data: {
          proofUrl: proofUrl.trim(),
          status: PAYMENT_STATUS.MANUAL_REVIEW,
          amount: ctx.amount,
          metadata: ctx.metadata ?? undefined,
        },
      });
    } else {
      row = await tx.payment.create({
        data: {
          applicationId: ctx.application.id,
          category: ctx.category,
          amount: ctx.amount,
          method: "manual",
          status: PAYMENT_STATUS.MANUAL_REVIEW,
          proofUrl: proofUrl.trim(),
          metadata: ctx.metadata ?? undefined,
        },
      });
    }

    if (
      ctx.category === PAYMENT_CATEGORY.REGISTRATION &&
      ctx.application.status === APPLICATION_STATUS.DRAFT
    ) {
      await tx.application.update({
        where: { id: ctx.application.id },
        data: { status: APPLICATION_STATUS.PENDING_PAYMENT },
      });
    }

    return row;
  });

  return mapPayment(payment);
}

export async function initiateMidtransPayment(userId, { category, feeItemIds } = {}) {
  const ctx = await resolvePaymentContext(userId, category, feeItemIds);
  assertPaymentAllowed(ctx.settings, "midtrans");

  if (
    ctx.latestPayment?.method === "manual" &&
    ctx.latestPayment.status === PAYMENT_STATUS.MANUAL_REVIEW &&
    ctx.latestPayment.category === ctx.category
  ) {
    throw new Error("Bukti transfer sedang diverifikasi. Tunggu konfirmasi admin.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });
  if (!user) throw new Error("Pengguna tidak ditemukan");

  let paymentId = ctx.latestPayment?.id;

  if (
    !ctx.latestPayment ||
    ctx.latestPayment.method !== "midtrans" ||
    ctx.latestPayment.status === PAYMENT_STATUS.FAILED ||
    ctx.latestPayment.category !== ctx.category
  ) {
    const created = await prisma.payment.create({
      data: {
        applicationId: ctx.application.id,
        category: ctx.category,
        amount: ctx.amount,
        method: "midtrans",
        status: PAYMENT_STATUS.PENDING,
        metadata: ctx.metadata ?? undefined,
      },
    });
    paymentId = created.id;

    if (
      ctx.category === PAYMENT_CATEGORY.REGISTRATION &&
      ctx.application.status === APPLICATION_STATUS.DRAFT
    ) {
      await prisma.application.update({
        where: { id: ctx.application.id },
        data: { status: APPLICATION_STATUS.PENDING_PAYMENT },
      });
    }
  } else {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount: ctx.amount,
        metadata: ctx.metadata ?? undefined,
      },
    });
  }

  const orderId = buildOrderId(paymentId);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { externalId: orderId },
  });

  const snap = await createSnapTransaction({
    serverKey: ctx.settings.midtransServerKey,
    production: ctx.settings.midtransProduction,
    orderId,
    amount: ctx.amount,
    customer: {
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  });

  return {
    payment: mapPayment(
      await prisma.payment.findUnique({
        where: { id: paymentId },
        select: PAYMENT_SELECT,
      })
    ),
    snapToken: snap.token,
    clientKey: ctx.settings.midtransClientKey,
    orderId,
  };
}

export async function refreshMidtransPayment(userId, paymentId) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      application: { userId },
      method: "midtrans",
    },
    select: {
      ...PAYMENT_SELECT,
      applicationId: true,
      application: { select: { status: true } },
    },
  });

  if (!payment) throw new Error("Pembayaran tidak ditemukan");
  if (!payment.externalId) throw new Error("Transaksi Midtrans belum dibuat");

  const settings = await getPaymentSettingsForServer();
  assertPaymentAllowed(settings, "midtrans");

  const remote = await getMidtransTransactionStatus({
    serverKey: settings.midtransServerKey,
    production: settings.midtransProduction,
    orderId: payment.externalId,
  });

  const nextStatus = remote.paymentStatus;
  const paidAt = nextStatus === PAYMENT_STATUS.PAID ? new Date() : null;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === PAYMENT_STATUS.PAID ? paidAt : null,
        metadata: {
          ...(payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {}),
          transactionStatus: remote.transactionStatus,
          fraudStatus: remote.fraudStatus,
          checkedAt: new Date().toISOString(),
        },
      },
      select: PAYMENT_SELECT,
    });

    if (
      nextStatus === PAYMENT_STATUS.PAID &&
      payment.category === PAYMENT_CATEGORY.REGISTRATION &&
      (payment.application.status === APPLICATION_STATUS.PENDING_PAYMENT ||
        payment.application.status === APPLICATION_STATUS.DRAFT)
    ) {
      await tx.application.update({
        where: { id: payment.applicationId },
        data: { status: APPLICATION_STATUS.PAID },
      });
    }

    return row;
  });

  return mapPayment(updated);
}

export async function handleMidtransNotification(body) {
  const orderId = body?.order_id;
  const paymentId = parseOrderId(orderId);
  if (!paymentId) return { handled: false, reason: "invalid_order_id" };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      application: { select: { userId: true } },
    },
  });

  if (!payment) return { handled: false, reason: "payment_not_found" };

  return refreshMidtransPayment(payment.application.userId, payment.id);
}
