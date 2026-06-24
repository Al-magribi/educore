import { prisma } from "@/lib/db.js";
import { APPLICATION_STATUS, PAYMENT_STATUS } from "@/lib/constants.js";
import { getPublicPaymentSettings, getPaymentSettingsForServer } from "./settings.js";
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
  return {
    id: row.id,
    amount: row.amount,
    status: row.status,
    method: row.method,
    proofUrl: row.proofUrl,
    externalId: row.externalId,
    paidAt: formatDateTime(row.paidAt),
    createdAt: formatDateTime(row.createdAt),
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
        take: 1,
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          proofUrl: true,
          externalId: true,
          paidAt: true,
          createdAt: true,
        },
      },
    },
  });
}

async function ensureApplication(userId, periodId) {
  const existing = await getUserApplication(userId, periodId);
  if (existing) return existing;

  const created = await prisma.application.create({
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
        take: 1,
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          proofUrl: true,
          externalId: true,
          paidAt: true,
          createdAt: true,
        },
      },
    },
  });

  return created;
}

/** Status tampilan calon siswa — mengutamakan record pembayaran terbaru dari admin. */
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

export async function getApplicantPaymentPageData(userId) {
  const [settings, activePeriod, user] = await Promise.all([
    getPublicPaymentSettings(),
    getActivePeriod(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    }),
  ]);

  if (!activePeriod) {
    return {
      activePeriod: null,
      settings: settings
        ? {
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
          }
        : null,
      application: null,
      payment: null,
      methods: [],
      midtransScriptUrl: null,
      applicant: user,
    };
  }

  const application = await getUserApplication(userId, activePeriod.id);
  const payment = mapPayment(application?.payments?.[0] ?? null);
  const methods = settings ? buildMethods(settings) : [];
  const paymentState = deriveApplicantPaymentState(payment, application?.status);

  return {
    activePeriod: {
      id: activePeriod.id,
      name: activePeriod.name,
      academicYear: activePeriod.academicYear,
      closesAt: formatDateTime(activePeriod.closesAt),
    },
    settings: settings
      ? {
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
        }
      : null,
    application: application
      ? {
          id: application.id,
          status: application.status,
          isPaid: paymentState.isPaid,
        }
      : null,
    payment,
    paymentState,
    methods,
    midtransScriptUrl: settings?.midtransEnabled
      ? getMidtransSnapScriptUrl(settings.midtransProduction)
      : null,
    applicant: user,
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

async function assertCanInitiatePayment(userId, periodId) {
  const [application, settings] = await Promise.all([
    ensureApplication(userId, periodId),
    getPaymentSettingsForServer(),
  ]);

  const latest = application.payments[0];
  if (latest?.status === PAYMENT_STATUS.PAID) {
    throw new Error("Pembayaran sudah lunas");
  }
  if (latest?.status === PAYMENT_STATUS.MANUAL_REVIEW) {
    throw new Error("Bukti pembayaran sedang diverifikasi admin");
  }
  if (PAID_APPLICATION_STATUSES.has(application.status)) {
    throw new Error("Pendaftaran sudah dibayar");
  }

  return { application, settings, latestPayment: latest };
}

export async function submitManualPayment(userId, proofUrl) {
  if (!proofUrl?.trim()) throw new Error("Bukti pembayaran wajib diunggah");

  const activePeriod = await getActivePeriod();
  if (!activePeriod) throw new Error("Periode pendaftaran tidak aktif");

  const { application, settings, latestPayment } = await assertCanInitiatePayment(
    userId,
    activePeriod.id
  );
  assertPaymentAllowed(settings, "manual");

  if (latestPayment?.method === "midtrans" && latestPayment.status === PAYMENT_STATUS.PENDING) {
    throw new Error("Anda memiliki transaksi online yang belum selesai");
  }

  const amount = settings?.registrationFee ?? 350000;

  const payment = await prisma.$transaction(async (tx) => {
    let row;

    if (latestPayment?.method === "manual" && latestPayment.status === PAYMENT_STATUS.PENDING) {
      row = await tx.payment.update({
        where: { id: latestPayment.id },
        data: {
          proofUrl: proofUrl.trim(),
          status: PAYMENT_STATUS.MANUAL_REVIEW,
        },
      });
    } else {
      row = await tx.payment.create({
        data: {
          applicationId: application.id,
          amount,
          method: "manual",
          status: PAYMENT_STATUS.MANUAL_REVIEW,
          proofUrl: proofUrl.trim(),
        },
      });
    }

    if (application.status === APPLICATION_STATUS.DRAFT) {
      await tx.application.update({
        where: { id: application.id },
        data: { status: APPLICATION_STATUS.PENDING_PAYMENT },
      });
    }

    return row;
  });

  return mapPayment(payment);
}

export async function initiateMidtransPayment(userId) {
  const activePeriod = await getActivePeriod();
  if (!activePeriod) throw new Error("Periode pendaftaran tidak aktif");

  const { application, settings, latestPayment } = await assertCanInitiatePayment(
    userId,
    activePeriod.id
  );
  assertPaymentAllowed(settings, "midtrans");

  if (latestPayment?.method === "manual" && latestPayment.status === PAYMENT_STATUS.MANUAL_REVIEW) {
    throw new Error("Bukti transfer sedang diverifikasi. Tunggu konfirmasi admin.");
  }

  const amount = settings.registrationFee ?? 350000;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });

  if (!user) throw new Error("Pengguna tidak ditemukan");

  let paymentId = latestPayment?.id;

  if (
    !latestPayment ||
    latestPayment.method !== "midtrans" ||
    latestPayment.status === PAYMENT_STATUS.FAILED
  ) {
    const created = await prisma.payment.create({
      data: {
        applicationId: application.id,
        amount,
        method: "midtrans",
        status: PAYMENT_STATUS.PENDING,
      },
    });
    paymentId = created.id;

    if (application.status === APPLICATION_STATUS.DRAFT) {
      await prisma.application.update({
        where: { id: application.id },
        data: { status: APPLICATION_STATUS.PENDING_PAYMENT },
      });
    }
  }

  const orderId = buildOrderId(paymentId);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { externalId: orderId },
  });

  const snap = await createSnapTransaction({
    serverKey: settings.midtransServerKey,
    production: settings.midtransProduction,
    orderId,
    amount,
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
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          proofUrl: true,
          externalId: true,
          paidAt: true,
          createdAt: true,
        },
      })
    ),
    snapToken: snap.token,
    clientKey: settings.midtransClientKey,
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
      id: true,
      applicationId: true,
      amount: true,
      status: true,
      method: true,
      proofUrl: true,
      externalId: true,
      paidAt: true,
      createdAt: true,
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
          transactionStatus: remote.transactionStatus,
          fraudStatus: remote.fraudStatus,
          checkedAt: new Date().toISOString(),
        },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        proofUrl: true,
        externalId: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (
      nextStatus === PAYMENT_STATUS.PAID &&
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
      applicationId: true,
      application: { select: { status: true, userId: true } },
    },
  });

  if (!payment) return { handled: false, reason: "payment_not_found" };

  return refreshMidtransPayment(payment.application.userId, payment.id);
}
