import { prisma } from "@/lib/db.js";
import { getPublicSchoolBranding } from "@/modules/cms/school-settings.js";

const PAID_STATUSES = new Set([
  "paid",
  "form_in_progress",
  "submitted",
  "under_review",
  "accepted",
  "rejected",
]);

const FORM_DONE_STATUSES = new Set([
  "submitted",
  "under_review",
  "accepted",
  "rejected",
]);

export const applicationStatusLabels = {
  draft: "Belum memulai",
  pending_payment: "Menunggu pembayaran",
  paid: "Pembayaran lunas",
  form_in_progress: "Mengisi formulir",
  submitted: "Diajukan",
  under_review: "Sedang ditinjau",
  accepted: "Diterima",
  rejected: "Tidak diterima",
};

const statusTone = {
  draft: "slate",
  pending_payment: "amber",
  paid: "blue",
  form_in_progress: "blue",
  submitted: "indigo",
  under_review: "indigo",
  accepted: "emerald",
  rejected: "rose",
};

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function deriveMenuStatus(application) {
  if (!application) {
    return {
      pembayaran: "pending",
      formulir: "pending",
      kuesioner: "pending",
    };
  }

  const { status, counts, latestPayment, hasQuestionnaire } = application;

  const pembayaran =
    latestPayment?.status === "paid" || PAID_STATUSES.has(status)
      ? "done"
      : latestPayment?.status === "manual_review"
        ? "in_progress"
        : "pending";

  const formulir =
    FORM_DONE_STATUSES.has(status) || counts.answers > 0
      ? status === "form_in_progress" && counts.answers > 0
        ? "in_progress"
        : FORM_DONE_STATUSES.has(status)
          ? "done"
          : counts.answers > 0
            ? "in_progress"
            : "pending"
      : PAID_STATUSES.has(status)
        ? "pending"
        : "locked";

  const kuesioner = !hasQuestionnaire
    ? "optional"
    : counts.questionnaireResponses > 0
      ? "done"
      : PAID_STATUSES.has(status)
        ? "pending"
        : "locked";

  return { pembayaran, formulir, kuesioner };
}

export async function getApplicantDashboardData(userId) {
  const [school, activePeriod, applicationRow, hasQuestionnaire] = await Promise.all([
    getPublicSchoolBranding(),
    prisma.admissionPeriod.findFirst({
      where: { isActive: true },
      orderBy: { opensAt: "desc" },
      select: {
        id: true,
        name: true,
        academicYear: true,
        opensAt: true,
        closesAt: true,
      },
    }),
    prisma.application.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        period: {
          select: {
            name: true,
            academicYear: true,
            closesAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, amount: true, paidAt: true },
        },
        _count: {
          select: {
            answers: true,
            files: true,
            questionnaireResponses: true,
          },
        },
      },
    }),
    activePeriodQuestionnaireExists(),
  ]);

  const application = applicationRow
    ? {
        id: applicationRow.id,
        status: applicationRow.status,
        statusLabel: applicationStatusLabels[applicationRow.status] ?? applicationRow.status,
        statusTone: statusTone[applicationRow.status] ?? "slate",
        submittedAt: formatDate(applicationRow.submittedAt),
        updatedAt: formatDate(applicationRow.updatedAt),
        periodName: applicationRow.period?.name ?? activePeriod?.name ?? null,
        academicYear: applicationRow.period?.academicYear ?? activePeriod?.academicYear ?? null,
        closesAt: formatDate(applicationRow.period?.closesAt ?? activePeriod?.closesAt),
        latestPayment: applicationRow.payments[0] ?? null,
        counts: applicationRow._count,
        hasQuestionnaire,
      }
    : null;

  return {
    school,
    activePeriod: activePeriod
      ? {
          name: activePeriod.name,
          academicYear: activePeriod.academicYear,
          opensAt: formatDate(activePeriod.opensAt),
          closesAt: formatDate(activePeriod.closesAt),
        }
      : null,
    application,
    menuStatus: deriveMenuStatus(application),
  };
}

async function activePeriodQuestionnaireExists() {
  const period = await prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!period) return false;

  const count = await prisma.questionnaire.count({
    where: { periodId: period.id, isActive: true },
  });
  return count > 0;
}
