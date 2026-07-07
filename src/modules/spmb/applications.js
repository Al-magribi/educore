import { prisma } from "@/lib/db.js";
import { normalizeFormSchema } from "@/modules/spmb/forms.js";

const SCHOOL_FIELD_IDS = ["prev_school", "asal_sekolah", "previous_school"];

function answerText(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "value" in value) return answerText(value.value);
  return null;
}

function getSchoolFromAnswers(answers) {
  for (const fieldId of SCHOOL_FIELD_IDS) {
    const match = answers.find((item) => item.fieldId === fieldId);
    const text = answerText(match?.value);
    if (text) return text;
  }

  const fallback = answers.find(
    (item) => item.fieldId.includes("school") || item.fieldId.includes("sekolah")
  );
  return answerText(fallback?.value) ?? "—";
}

function formatSubmittedDate(value) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function formatSubmittedDateTime(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function fileNameFromUrl(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  const segment = url.split("/").pop();
  return segment ? decodeURIComponent(segment) : "Berkas terunggah";
}

function formatFieldDisplayValue(field, rawValue) {
  if (isEmptyValue(rawValue)) return null;

  if (field.type === "file") {
    const url = typeof rawValue === "string" ? rawValue.trim() : null;
    if (!url) return null;
    return {
      type: "file",
      url,
      fileName: fileNameFromUrl(url),
    };
  }

  if (field.type === "checkbox") {
    return rawValue ? "Ya" : "Tidak";
  }

  return String(rawValue);
}

function buildFieldSections(groups, answersMap) {
  return (groups ?? []).map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description ?? "",
    fields: (group.fields ?? []).map((field) => {
      const display = formatFieldDisplayValue(field, answersMap[field.id]);
      return {
        id: field.id,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        value: display,
        hasValue: display != null,
      };
    }),
  }));
}

export function mapApplication(row) {
  return {
    id: row.id,
    name: row.user.name,
    email: row.user.email,
    phone: row.user.phone ?? "—",
    status: row.status,
    submittedAt: formatSubmittedDate(row.submittedAt),
    school: getSchoolFromAnswers(row.answers),
  };
}

export async function listApplications() {
  const rows = await prisma.application.findMany({
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      submittedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      answers: {
        select: {
          fieldId: true,
          value: true,
        },
      },
    },
  });

  return rows.map(mapApplication);
}

const REVIEW_STATUSES = new Set(["accepted", "rejected", "under_review"]);

export async function updateApplicationStatus(id, status, reviewedById) {
  if (!REVIEW_STATUSES.has(status)) {
    throw new Error("Status tidak valid");
  }

  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) throw new Error("Pendaftaran tidak ditemukan");

  const row = await prisma.application.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById,
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      answers: {
        select: {
          fieldId: true,
          value: true,
        },
      },
    },
  });

  return mapApplication(row);
}

const RESETTABLE_STATUSES = new Set([
  "accepted",
  "rejected",
  "under_review",
  "form_in_progress",
]);

export async function resetApplicationToSubmitted(id) {
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) throw new Error("Pendaftaran tidak ditemukan");

  if (!RESETTABLE_STATUSES.has(existing.status)) {
    throw new Error("Status pendaftaran tidak dapat direset ke diajukan");
  }

  const row = await prisma.application.update({
    where: { id },
    data: {
      status: "submitted",
      reviewedAt: null,
      reviewedById: null,
      submittedAt: existing.submittedAt ?? new Date(),
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      answers: {
        select: {
          fieldId: true,
          value: true,
        },
      },
    },
  });

  return mapApplication(row);
}

export { deleteApplication } from "@/modules/spmb/application-cleanup.js";

export async function getApplicationDetail(id) {
  const row = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      periodId: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      period: {
        select: {
          name: true,
          academicYear: true,
        },
      },
      answers: {
        select: {
          fieldId: true,
          value: true,
        },
      },
    },
  });

  if (!row) throw new Error("Pendaftaran tidak ditemukan");

  const formRow = await prisma.formDefinition.findFirst({
    where: { periodId: row.periodId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  const schema = formRow ? normalizeFormSchema(formRow.schema) : { meta: {}, groups: [] };
  const answersMap = answersToMap(row.answers);

  return {
    id: row.id,
    name: row.user.name,
    email: row.user.email,
    phone: row.user.phone ?? "—",
    status: row.status,
    submittedAt: formatSubmittedDate(row.submittedAt),
    submittedAtFormatted: formatSubmittedDateTime(row.submittedAt),
    school: getSchoolFromAnswers(row.answers),
    periodName: row.period?.name ?? null,
    academicYear: row.period?.academicYear ?? null,
    formDefinition: formRow
      ? {
          id: formRow.id,
          name: formRow.name,
          schema,
        }
      : null,
    sections: buildFieldSections(schema.groups, answersMap),
    answers: answersMap,
  };
}
