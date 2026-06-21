import { prisma } from "@/lib/db.js";

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

function mapApplication(row) {
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
