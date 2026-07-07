import { prisma } from "@/lib/db.js";
import { APPLICATION_STATUS } from "@/lib/constants.js";
import { deriveApplicantPaymentState } from "@/modules/payment/applicant-payment.js";
import {
  computeQuestionnaireResult,
  getActiveQuestionnaires,
  isQuestionAnswered,
  normalizeQuestionnaireSchema,
} from "@/modules/spmb/questionnaires.js";

const PAID_STATUSES = new Set([
  APPLICATION_STATUS.PAID,
  APPLICATION_STATUS.FORM_IN_PROGRESS,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.REJECTED,
]);

const LOCKED_STATUSES = new Set([
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
    status: row.status,
    paidAt: formatDateTime(row.paidAt),
  };
}

export function deriveQuestionnaireAccess(paymentState, applicationStatus) {
  const canFill = paymentState.isPaid === true && PAID_STATUSES.has(applicationStatus);
  const isLocked = LOCKED_STATUSES.has(applicationStatus);
  const isEditable = canFill && !isLocked;
  const lockReason = !canFill
    ? paymentState.isReview
      ? "review"
      : "payment"
    : isLocked
      ? "finalized"
      : null;

  return { canFill, isEditable, isLocked, lockReason };
}

function mapResponse(row, questionnaire) {
  const answers = row?.answers && typeof row.answers === "object" ? row.answers : null;
  return {
    id: row?.id ?? null,
    questionnaireId: questionnaire.id,
    submittedAt: formatDateTime(row?.submittedAt),
    selections: answers?.selections ?? {},
    answeredCount: answers?.answeredCount ?? 0,
    totalQuestions: answers?.totalQuestions ?? questionnaire.schema?.questions?.length ?? 0,
    isComplete: Boolean(row?.id && (answers?.isComplete ?? false)),
  };
}

export async function getQuestionnaireCompletionStatus(applicationId, periodId) {
  const questionnaires = await getActiveQuestionnaires(periodId);
  if (questionnaires.length === 0) {
    return { total: 0, completed: 0, percent: 100, isComplete: true, incomplete: [] };
  }

  const responses = applicationId
    ? await prisma.questionnaireResponse.findMany({
        where: {
          applicationId,
          questionnaireId: { in: questionnaires.map((q) => q.id) },
        },
        select: { id: true, questionnaireId: true, answers: true },
      })
    : [];

  const responseMap = new Map(responses.map((r) => [r.questionnaireId, r]));
  const incomplete = [];
  let completed = 0;

  for (const q of questionnaires) {
    const row = responseMap.get(q.id);
    const answers = row?.answers && typeof row.answers === "object" ? row.answers : null;
    const isComplete = Boolean(row?.id && answers?.isComplete);
    if (isComplete) {
      completed++;
    } else {
      incomplete.push({ id: q.id, title: q.title });
    }
  }

  return {
    total: questionnaires.length,
    completed,
    percent: Math.round((completed / questionnaires.length) * 100),
    isComplete: completed === questionnaires.length,
    incomplete,
  };
}

export async function assertAllQuestionnairesComplete(applicationId, periodId) {
  const status = await getQuestionnaireCompletionStatus(applicationId, periodId);
  if (!status.isComplete) {
    const titles = status.incomplete.map((q) => q.title).slice(0, 3).join(", ");
    throw new Error(
      `Selesaikan semua kuesioner terlebih dahulu${titles ? `: ${titles}${status.incomplete.length > 3 ? "..." : ""}` : ""}`
    );
  }
  return status;
}

export async function getApplicantQuestionnairePageData(userId) {
  const activePeriod = await prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
    select: {
      id: true,
      name: true,
      academicYear: true,
      closesAt: true,
    },
  });

  if (!activePeriod) {
    return {
      activePeriod: null,
      questionnaires: [],
      application: null,
      payment: null,
      paymentState: { isPaid: false, isReview: false, isFailed: false, canPay: true },
      access: { canFill: false, isEditable: false, isLocked: false, lockReason: "period" },
    };
  }

  const [questionnaires, applicationRow] = await Promise.all([
    getActiveQuestionnaires(activePeriod.id),
    prisma.application.findUnique({
      where: {
        userId_periodId: { userId, periodId: activePeriod.id },
      },
      select: {
        id: true,
        status: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, paidAt: true },
        },
        questionnaireResponses: {
          select: {
            id: true,
            questionnaireId: true,
            answers: true,
            submittedAt: true,
          },
        },
      },
    }),
  ]);

  const payment = mapPayment(applicationRow?.payments?.[0] ?? null);
  const paymentState = deriveApplicantPaymentState(payment, applicationRow?.status ?? APPLICATION_STATUS.DRAFT);
  const access = deriveQuestionnaireAccess(paymentState, applicationRow?.status ?? APPLICATION_STATUS.DRAFT);

  const responseMap = new Map(
    (applicationRow?.questionnaireResponses ?? []).map((r) => [r.questionnaireId, r])
  );

  const items = questionnaires.map((q) => ({
    ...q,
    response: mapResponse(responseMap.get(q.id), q),
  }));

  const completedCount = items.filter((q) => q.response.isComplete).length;

  return {
    activePeriod: {
      id: activePeriod.id,
      name: activePeriod.name,
      academicYear: activePeriod.academicYear,
      closesAt: formatDateTime(activePeriod.closesAt),
    },
    questionnaires: items,
    application: applicationRow
      ? { id: applicationRow.id, status: applicationRow.status }
      : null,
    payment,
    paymentState,
    access,
    progress: {
      total: items.length,
      completed: completedCount,
      percent: items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0,
    },
  };
}

export async function saveQuestionnaireResponse(userId, questionnaireId, { selections, submit = false }) {
  if (!questionnaireId) throw new Error("Kuesioner tidak valid");
  if (!selections || typeof selections !== "object") {
    throw new Error("Jawaban tidak valid");
  }

  const activePeriod = await prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
    select: { id: true },
  });
  if (!activePeriod) throw new Error("Tidak ada periode pendaftaran aktif");

  const questionnaire = await prisma.questionnaire.findFirst({
    where: { id: questionnaireId, periodId: activePeriod.id, isActive: true },
  });
  if (!questionnaire) throw new Error("Kuesioner tidak ditemukan atau tidak aktif");

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
  const access = deriveQuestionnaireAccess(paymentState, application.status);

  if (!access.canFill) {
    if (paymentState.isReview) {
      throw new Error("Pembayaran sedang diverifikasi. Kuesioner belum dapat diisi.");
    }
    throw new Error("Pembayaran belum terverifikasi. Selesaikan pembayaran terlebih dahulu.");
  }

  if (!access.isEditable) {
    throw new Error("Kuesioner tidak dapat diubah pada status pendaftaran saat ini");
  }

  const schema = normalizeQuestionnaireSchema(questionnaire.schema);
  const allowedQuestionIds = new Set(schema.questions.map((q) => q.id));

  const sanitizedSelections = {};
  for (const [qId, optionId] of Object.entries(selections)) {
    if (!allowedQuestionIds.has(qId)) continue;
    if (typeof optionId === "string" && optionId.trim()) {
      sanitizedSelections[qId] = optionId.trim();
    }
  }

  if (submit) {
    const unanswered = schema.questions.filter(
      (q) => !isQuestionAnswered(q, sanitizedSelections[q.id])
    );
    if (unanswered.length > 0) {
      throw new Error(
        `Jawab semua pertanyaan terlebih dahulu (${unanswered.length} belum dijawab)`
      );
    }
  }

  const result = computeQuestionnaireResult(schema, sanitizedSelections);
  const answersPayload = {
    selections: result.selections,
    answeredCount: result.answeredCount,
    totalQuestions: result.totalQuestions,
    isComplete: submit ? result.isComplete : result.answeredCount > 0,
  };

  await prisma.questionnaireResponse.upsert({
    where: {
      applicationId_questionnaireId: {
        applicationId: application.id,
        questionnaireId,
      },
    },
    create: {
      applicationId: application.id,
      questionnaireId,
      answers: answersPayload,
    },
    update: {
      answers: answersPayload,
      submittedAt: new Date(),
    },
  });

  return getApplicantQuestionnairePageData(userId);
}
