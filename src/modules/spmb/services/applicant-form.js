import { prisma } from "@/lib/db.js";
import { APPLICATION_STATUS } from "@/lib/constants.js";
import { getActiveFormDefinition } from "@/modules/spmb/forms.js";
import { deriveApplicantPaymentState } from "@/modules/payment/applicant-payment.js";

const SUBMITTED_STATUSES = new Set([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.REJECTED,
]);

const EDITABLE_STATUSES = new Set([
  APPLICATION_STATUS.PAID,
  APPLICATION_STATUS.FORM_IN_PROGRESS,
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
    paidAt: formatDateTime(row.paidAt),
    createdAt: formatDateTime(row.createdAt),
  };
}

function answersToMap(rows) {
  const map = {};
  for (const row of rows ?? []) {
    map[row.fieldId] = row.value;
  }
  return map;
}

function isEmptyValue(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

function collectFormFields(groups) {
  const fields = [];
  for (const group of groups ?? []) {
    for (const field of group.fields ?? []) {
      fields.push(field);
    }
  }
  return fields;
}

function validateRequiredFields(groups, answers) {
  const missing = [];
  for (const field of collectFormFields(groups)) {
    if (field.type === "file") continue;
    if (!field.required) continue;
    if (isEmptyValue(answers[field.id])) {
      missing.push(field.label || field.id);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Field wajib belum diisi: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`);
  }
}

export function deriveFormAccess(paymentState, applicationStatus) {
  const canFill = paymentState.isPaid === true;
  const isSubmitted = SUBMITTED_STATUSES.has(applicationStatus);
  const isEditable = canFill && !isSubmitted && EDITABLE_STATUSES.has(applicationStatus);
  const lockReason = !canFill
    ? paymentState.isReview
      ? "review"
      : "payment"
    : isSubmitted
      ? "submitted"
      : null;

  return { canFill, isEditable, isSubmitted, lockReason };
}

export async function getApplicantFormPageData(userId) {
  const [activePeriod, formDefinition, user] = await Promise.all([
    prisma.admissionPeriod.findFirst({
      where: { isActive: true },
      orderBy: { opensAt: "desc" },
      select: {
        id: true,
        name: true,
        academicYear: true,
        closesAt: true,
      },
    }),
    getActiveFormDefinition(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);

  if (!activePeriod) {
    return {
      activePeriod: null,
      formDefinition: null,
      application: null,
      answers: {},
      payment: null,
      paymentState: { isPaid: false, isReview: false, isFailed: false, canPay: true },
      access: { canFill: false, isEditable: false, isSubmitted: false, lockReason: "period" },
      applicant: user,
    };
  }

  const applicationRow = await prisma.application.findUnique({
    where: {
      userId_periodId: { userId, periodId: activePeriod.id },
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          proofUrl: true,
          paidAt: true,
          createdAt: true,
        },
      },
      answers: {
        select: { fieldId: true, value: true },
      },
    },
  });

  const payment = mapPayment(applicationRow?.payments?.[0] ?? null);
  const paymentState = deriveApplicantPaymentState(payment, applicationRow?.status);
  const access = deriveFormAccess(paymentState, applicationRow?.status ?? APPLICATION_STATUS.DRAFT);
  const answers = answersToMap(applicationRow?.answers);

  const fields = collectFormFields(formDefinition?.schema?.groups ?? []);
  const requiredCount = fields.filter((f) => f.required && f.type !== "file").length;
  const filledRequired = fields.filter(
    (f) => f.required && f.type !== "file" && !isEmptyValue(answers[f.id])
  ).length;
  const totalFields = fields.filter((f) => f.type !== "file").length;
  const filledFields = fields.filter((f) => f.type !== "file" && !isEmptyValue(answers[f.id])).length;

  return {
    activePeriod: {
      id: activePeriod.id,
      name: activePeriod.name,
      academicYear: activePeriod.academicYear,
      closesAt: formatDateTime(activePeriod.closesAt),
    },
    formDefinition: formDefinition
      ? {
          id: formDefinition.id,
          name: formDefinition.name,
          schema: formDefinition.schema,
        }
      : null,
    application: applicationRow
      ? {
          id: applicationRow.id,
          status: applicationRow.status,
          submittedAt: formatDateTime(applicationRow.submittedAt),
          updatedAt: formatDateTime(applicationRow.updatedAt),
        }
      : null,
    answers,
    payment,
    paymentState,
    access,
    progress: {
      requiredCount,
      filledRequired,
      totalFields,
      filledFields,
      percent: totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
    },
    applicant: user,
  };
}

export async function saveApplicationForm(userId, { answers, submit = false }) {
  if (!answers || typeof answers !== "object") {
    throw new Error("Data formulir tidak valid");
  }

  const activePeriod = await prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
    select: { id: true },
  });
  if (!activePeriod) throw new Error("Tidak ada periode pendaftaran aktif");

  const formDefinition = await getActiveFormDefinition();
  if (!formDefinition) throw new Error("Formulir pendaftaran belum dikonfigurasi");

  const application = await prisma.application.findUnique({
    where: {
      userId_periodId: { userId, periodId: activePeriod.id },
    },
    select: {
      id: true,
      status: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  if (!application) {
    throw new Error("Selesaikan pembayaran terlebih dahulu");
  }

  const payment = application.payments[0] ? { status: application.payments[0].status } : null;
  const paymentState = deriveApplicantPaymentState(payment, application.status);
  const access = deriveFormAccess(paymentState, application.status);

  if (!access.canFill) {
    if (paymentState.isReview) {
      throw new Error("Pembayaran sedang diverifikasi admin. Formulir belum dapat diisi.");
    }
    throw new Error("Pembayaran belum terverifikasi. Selesaikan pembayaran terlebih dahulu.");
  }

  if (access.isSubmitted) {
    throw new Error("Formulir sudah diajukan dan tidak dapat diubah");
  }

  if (!EDITABLE_STATUSES.has(application.status)) {
    throw new Error("Status pendaftaran tidak mengizinkan pengisian formulir");
  }

  const groups = formDefinition.schema?.groups ?? [];
  const allowedFieldIds = new Set(
    collectFormFields(groups)
      .filter((f) => f.type !== "file")
      .map((f) => f.id)
  );

  const sanitized = {};
  for (const [fieldId, value] of Object.entries(answers)) {
    if (!allowedFieldIds.has(fieldId)) continue;
    if (typeof value === "string") {
      sanitized[fieldId] = value.trim();
    } else {
      sanitized[fieldId] = value;
    }
  }

  if (submit) {
    validateRequiredFields(groups, answers);
  }

  const nextStatus = submit
    ? APPLICATION_STATUS.SUBMITTED
    : application.status === APPLICATION_STATUS.PAID
      ? APPLICATION_STATUS.FORM_IN_PROGRESS
      : application.status;

  await prisma.$transaction(async (tx) => {
    for (const [fieldId, value] of Object.entries(sanitized)) {
      if (isEmptyValue(value)) {
        await tx.applicationAnswer.deleteMany({
          where: { applicationId: application.id, fieldId },
        });
        continue;
      }

      await tx.applicationAnswer.upsert({
        where: {
          applicationId_fieldId: {
            applicationId: application.id,
            fieldId,
          },
        },
        create: {
          applicationId: application.id,
          fieldId,
          value,
        },
        update: { value },
      });
    }

    await tx.application.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        submittedAt: submit ? new Date() : undefined,
      },
    });
  });

  return getApplicantFormPageData(userId);
}
