import { prisma } from "@/lib/db.js";
import { normalizeFormSchema } from "@/modules/spmb/forms.js";
import { deriveApplicantPaymentState } from "@/modules/payment/applicant-payment.js";
import {
  assertAllQuestionnairesComplete,
  getQuestionnaireCompletionStatus,
} from "@/modules/spmb/services/applicant-questionnaire.js";
import {
  isFieldRequiredForSubmit,
  saveApplicationAnswers,
} from "@/modules/spmb/services/applicant-form.js";

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

async function getApplicationFormContext(applicationId) {
  const applicationRow = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      periodId: true,
      user: {
        select: { name: true, email: true, phone: true },
      },
      period: {
        select: {
          id: true,
          name: true,
          academicYear: true,
          closesAt: true,
        },
      },
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

  if (!applicationRow) throw new Error("Pendaftaran tidak ditemukan");

  const formDefinition = await prisma.formDefinition.findFirst({
    where: { periodId: applicationRow.periodId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  return { applicationRow, formDefinition };
}

function deriveAdminFormAccess(paymentState, applicationStatus) {
  const isSubmitted = ["submitted", "under_review", "accepted", "rejected"].includes(
    applicationStatus
  );

  return {
    canFill: true,
    isEditable: true,
    isSubmitted,
    lockReason: null,
  };
}

function buildFormPagePayload(applicationRow, formDefinition) {
  const payment = mapPayment(applicationRow.payments?.[0] ?? null);
  const paymentState = deriveApplicantPaymentState(payment, applicationRow.status);
  const access = deriveAdminFormAccess(paymentState, applicationRow.status);
  const answers = answersToMap(applicationRow.answers);

  const fields = collectFormFields(formDefinition?.schema?.groups ?? []);
  const requiredFields = fields.filter((f) => isFieldRequiredForSubmit(f, { skipFileFields: true }));
  const requiredCount = requiredFields.length;
  const filledRequired = requiredFields.filter((f) => !isEmptyValue(answers[f.id])).length;
  const totalFields = fields.length;
  const filledFields = fields.filter((f) => !isEmptyValue(answers[f.id])).length;

  return {
    activePeriod: applicationRow.period
      ? {
          id: applicationRow.period.id,
          name: applicationRow.period.name,
          academicYear: applicationRow.period.academicYear,
          closesAt: formatDateTime(applicationRow.period.closesAt),
        }
      : null,
    formDefinition: formDefinition
      ? {
          id: formDefinition.id,
          name: formDefinition.name,
          schema: normalizeFormSchema(formDefinition.schema),
        }
      : null,
    application: {
      id: applicationRow.id,
      status: applicationRow.status,
      submittedAt: formatDateTime(applicationRow.submittedAt),
      updatedAt: formatDateTime(applicationRow.updatedAt),
    },
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
    applicant: applicationRow.user,
  };
}

export async function getAdminApplicationFormData(applicationId) {
  const { applicationRow, formDefinition } = await getApplicationFormContext(applicationId);

  const questionnaireProgress = await getQuestionnaireCompletionStatus(
    applicationRow.id,
    applicationRow.periodId
  );

  return {
    ...buildFormPagePayload(applicationRow, formDefinition),
    questionnaireProgress,
  };
}

export async function saveAdminApplicationForm(applicationId, { answers, submit = false }) {
  if (!answers || typeof answers !== "object") {
    throw new Error("Data formulir tidak valid");
  }

  const { applicationRow, formDefinition } = await getApplicationFormContext(applicationId);
  if (!formDefinition) throw new Error("Formulir pendaftaran belum dikonfigurasi");

  const normalizedForm = {
    ...formDefinition,
    schema: normalizeFormSchema(formDefinition.schema),
  };

  if (submit) {
    await assertAllQuestionnairesComplete(applicationRow.id, applicationRow.periodId);
  }

  await saveApplicationAnswers(applicationRow, normalizedForm, {
    answers,
    submit,
    periodId: applicationRow.periodId,
    skipRequiredFileFields: true,
    adminOverride: true,
  });

  return getAdminApplicationFormData(applicationId);
}
