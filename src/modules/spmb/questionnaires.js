import { prisma } from "@/lib/db.js";

const TEST_TYPES = new Set(["kepribadian", "gaya_belajar", "survey", "custom"]);
const QUESTION_TYPES = new Set(["pilihan", "jawaban_panjang"]);

function inferQuestionType(question) {
  if (QUESTION_TYPES.has(question?.type)) return question.type;
  if (Array.isArray(question?.options) && question.options.length > 0) return "pilihan";
  return "jawaban_panjang";
}

export function normalizeQuestionnaireSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return {
      type: "custom",
      description: "",
      questions: [],
    };
  }

  return {
    type: TEST_TYPES.has(schema.type) ? schema.type : "custom",
    description: typeof schema.description === "string" ? schema.description.trim() : "",
    questions: Array.isArray(schema.questions)
      ? schema.questions.map((q) => {
          const type = inferQuestionType(q);
          return {
            id: String(q.id ?? "").trim(),
            type,
            text: String(q.text ?? "").trim(),
            placeholder: typeof q.placeholder === "string" ? q.placeholder.trim() : "",
            options:
              type === "pilihan" && Array.isArray(q.options)
                ? q.options.map((o) => ({
                    id: String(o.id ?? "").trim(),
                    label: String(o.label ?? "").trim(),
                  }))
                : [],
          };
        })
      : [],
  };
}

export function validateQuestionnaireSchema(schema) {
  const normalized = normalizeQuestionnaireSchema(schema);

  if (!normalized.questions.length) {
    throw new Error("Minimal satu pertanyaan diperlukan");
  }

  const questionIds = new Set();
  for (const question of normalized.questions) {
    if (!question.id) throw new Error("Setiap pertanyaan wajib memiliki ID");
    if (questionIds.has(question.id)) throw new Error(`ID pertanyaan duplikat: ${question.id}`);
    questionIds.add(question.id);
    if (!question.text) throw new Error("Teks pertanyaan wajib diisi");

    if (question.type === "pilihan") {
      if (!question.options.length) {
        throw new Error(`Pertanyaan "${question.id}" wajib memiliki opsi`);
      }
      const optionIds = new Set();
      for (const option of question.options) {
        if (!option.id) throw new Error("Setiap opsi wajib memiliki ID");
        if (optionIds.has(option.id)) throw new Error(`ID opsi duplikat: ${option.id}`);
        optionIds.add(option.id);
        if (!option.label) throw new Error("Label opsi wajib diisi");
      }
    }
  }

  return normalized;
}

export function isQuestionAnswered(question, value) {
  if (value == null) return false;
  if (question.type === "jawaban_panjang") {
    return typeof value === "string" && value.trim() !== "";
  }
  return typeof value === "string" && value.trim() !== "";
}

export function computeQuestionnaireResult(schema, selections) {
  const normalized = normalizeQuestionnaireSchema(schema);
  const sanitized = {};

  for (const question of normalized.questions) {
    const raw = selections?.[question.id];
    if (raw == null) continue;
    if (question.type === "jawaban_panjang") {
      if (typeof raw === "string" && raw.trim()) sanitized[question.id] = raw.trim();
    } else if (typeof raw === "string" && raw.trim()) {
      sanitized[question.id] = raw.trim();
    }
  }

  const answeredCount = normalized.questions.filter((q) =>
    isQuestionAnswered(q, sanitized[q.id])
  ).length;

  return {
    selections: sanitized,
    answeredCount,
    totalQuestions: normalized.questions.length,
    isComplete: answeredCount === normalized.questions.length,
  };
}

function mapQuestionnaire(row) {
  const schema = normalizeQuestionnaireSchema(row.schema);
  return {
    id: row.id,
    title: row.title,
    isActive: row.isActive,
    periodId: row.periodId,
    periodName: row.period?.name ?? null,
    academicYear: row.period?.academicYear ?? null,
    schema,
    questionCount: schema.questions.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getActiveAdmissionPeriod() {
  return prisma.admissionPeriod.findFirst({
    where: { isActive: true },
    orderBy: { opensAt: "desc" },
  });
}

export async function listQuestionnaires() {
  const rows = await prisma.questionnaire.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { period: { select: { name: true, academicYear: true } } },
  });
  return rows.map(mapQuestionnaire);
}

export async function getQuestionnaire(id) {
  const row = await prisma.questionnaire.findUnique({
    where: { id },
    include: { period: { select: { name: true, academicYear: true } } },
  });
  if (!row) return null;
  return mapQuestionnaire(row);
}

export async function createQuestionnaire(payload) {
  const title = payload.title?.trim();
  if (!title) throw new Error("Judul kuesioner wajib diisi");

  const schema = validateQuestionnaireSchema(payload.schema ?? payload);

  const period = await getActiveAdmissionPeriod();
  if (!period) throw new Error("Tidak ada periode SPMB aktif. Atur periode terlebih dahulu.");

  const total = await prisma.questionnaire.count();
  const isActive = total === 0 ? true : Boolean(payload.isActive);

  const row = await prisma.questionnaire.create({
    data: {
      periodId: period.id,
      title,
      schema,
      isActive,
    },
    include: { period: { select: { name: true, academicYear: true } } },
  });

  return mapQuestionnaire(row);
}

export async function updateQuestionnaire(id, payload) {
  const existing = await prisma.questionnaire.findUnique({ where: { id } });
  if (!existing) throw new Error("Kuesioner tidak ditemukan");

  const title = payload.title?.trim() || existing.title;
  const schema = validateQuestionnaireSchema(payload.schema ?? normalizeQuestionnaireSchema(existing.schema));

  const row = await prisma.questionnaire.update({
    where: { id },
    data: { title, schema },
    include: { period: { select: { name: true, academicYear: true } } },
  });

  return mapQuestionnaire(row);
}

export async function deleteQuestionnaire(id) {
  const existing = await prisma.questionnaire.findUnique({ where: { id } });
  if (!existing) throw new Error("Kuesioner tidak ditemukan");
  await prisma.questionnaire.delete({ where: { id } });
}

export async function activateQuestionnaire(id) {
  const existing = await prisma.questionnaire.findUnique({ where: { id } });
  if (!existing) throw new Error("Kuesioner tidak ditemukan");

  await prisma.questionnaire.update({ where: { id }, data: { isActive: true } });

  return getQuestionnaire(id);
}

export async function deactivateQuestionnaire(id) {
  const existing = await prisma.questionnaire.findUnique({ where: { id } });
  if (!existing) throw new Error("Kuesioner tidak ditemukan");

  await prisma.questionnaire.update({ where: { id }, data: { isActive: false } });

  return getQuestionnaire(id);
}

export async function getActiveQuestionnaires(periodId) {
  const rows = await prisma.questionnaire.findMany({
    where: { periodId, isActive: true },
    orderBy: { updatedAt: "desc" },
    include: { period: { select: { name: true, academicYear: true } } },
  });
  return rows.map(mapQuestionnaire);
}

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

function getOptionLetter(index) {
  if (index < 0) return "";
  return String.fromCharCode(65 + index);
}

function resolveAnswerLabel(question, answerValue) {
  if (!answerValue) return "—";
  if (question.type === "jawaban_panjang") return answerValue;

  const options = question.options ?? [];
  const optionIndex = options.findIndex((o) => o.id === answerValue);
  if (optionIndex >= 0) return getOptionLetter(optionIndex);

  const trimmed = String(answerValue).trim();
  if (/^[A-Z]$/i.test(trimmed)) return trimmed.toUpperCase();

  const labelIndex = options.findIndex(
    (o) => o.label?.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (labelIndex >= 0) return getOptionLetter(labelIndex);

  return answerValue;
}

export async function listQuestionnaireResponses({ questionnaireId } = {}) {
  const rows = await prisma.questionnaireResponse.findMany({
    where: questionnaireId ? { questionnaireId } : undefined,
    orderBy: { submittedAt: "desc" },
    include: {
      questionnaire: {
        select: { id: true, title: true, schema: true },
      },
      application: {
        select: {
          id: true,
          status: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return rows.map((row) => {
    const answers = row.answers && typeof row.answers === "object" ? row.answers : {};
    const selections = answers.selections ?? {};
    const schema = normalizeQuestionnaireSchema(row.questionnaire.schema);
    const answerDetails = schema.questions.map((question) => ({
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      answer: selections[question.id] ?? null,
      answerLabel: resolveAnswerLabel(question, selections[question.id]),
    }));

    return {
      id: row.id,
      submittedAt: formatDateTime(row.submittedAt),
      questionnaireId: row.questionnaireId,
      questionnaireTitle: row.questionnaire.title,
      applicationId: row.applicationId,
      applicantName: row.application.user.name,
      applicantEmail: row.application.user.email,
      applicationStatus: row.application.status,
      selections,
      answeredCount: answers.answeredCount ?? answerDetails.filter((a) => a.answer).length,
      totalQuestions: answers.totalQuestions ?? schema.questions.length,
      isComplete: answers.isComplete ?? false,
      answerDetails,
    };
  });
}
