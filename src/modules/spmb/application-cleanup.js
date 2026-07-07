import { prisma } from "@/lib/db.js";
import {
  APPLICATION_STATUS,
  PAYMENT_CATEGORY,
  PAYMENT_STATUS,
} from "@/lib/constants.js";
import { deleteUploadedFile } from "@/lib/storage/local.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

function extractFileUrl(value) {
  if (typeof value === "string" && isAppUploadUrl(value)) return value.trim();
  if (value && typeof value === "object" && typeof value.url === "string" && isAppUploadUrl(value.url)) {
    return value.url.trim();
  }
  return null;
}

export function collectApplicationUploadUrls({ answers = [], files = [], payments = [] } = {}) {
  const urls = new Set();

  for (const answer of answers) {
    const url = extractFileUrl(answer.value);
    if (url) urls.add(url);
  }

  for (const file of files) {
    if (isAppUploadUrl(file.fileUrl)) urls.add(file.fileUrl.trim());
  }

  for (const payment of payments) {
    if (isAppUploadUrl(payment.proofUrl)) urls.add(payment.proofUrl.trim());
  }

  return [...urls];
}

export async function deletePhysicalUploads(urls) {
  await Promise.all(urls.map((url) => deleteUploadedFile(url)));
}

async function resolveApplicationStatusAfterRegistrationPaymentRemoval(tx, applicationId, excludePaymentId) {
  const paidRegistration = await tx.payment.findFirst({
    where: {
      applicationId,
      category: PAYMENT_CATEGORY.REGISTRATION,
      status: PAYMENT_STATUS.PAID,
      ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
    },
    select: { id: true },
  });
  if (paidRegistration) return APPLICATION_STATUS.PAID;

  const pendingRegistration = await tx.payment.findFirst({
    where: {
      applicationId,
      category: PAYMENT_CATEGORY.REGISTRATION,
      ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
    },
    select: { id: true },
  });
  if (pendingRegistration) return APPLICATION_STATUS.PENDING_PAYMENT;

  return APPLICATION_STATUS.DRAFT;
}

export async function clearApplicationFormData(applicationId, tx = prisma) {
  const application = await tx.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      answers: { select: { value: true } },
      files: { select: { fileUrl: true } },
    },
  });
  if (!application) throw new Error("Pendaftaran tidak ditemukan");

  const uploadUrls = collectApplicationUploadUrls({
    answers: application.answers,
    files: application.files,
  });

  await tx.applicationAnswer.deleteMany({ where: { applicationId } });
  await tx.applicationFile.deleteMany({ where: { applicationId } });
  await tx.questionnaireResponse.deleteMany({ where: { applicationId } });

  return uploadUrls;
}

export async function deleteApplication(id) {
  const existing = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      answers: { select: { value: true } },
      files: { select: { fileUrl: true } },
      payments: { select: { proofUrl: true } },
    },
  });
  if (!existing) throw new Error("Pendaftaran tidak ditemukan");

  const uploadUrls = collectApplicationUploadUrls(existing);

  await prisma.application.delete({ where: { id } });
  await deletePhysicalUploads(uploadUrls);

  return { id };
}

export async function deleteRegistrationPaymentSideEffects(existing, tx = prisma) {
  const nextStatus = await resolveApplicationStatusAfterRegistrationPaymentRemoval(
    tx,
    existing.applicationId,
    existing.id
  );

  const shouldClearForm = nextStatus !== APPLICATION_STATUS.PAID;
  let formUploadUrls = [];

  if (shouldClearForm) {
    formUploadUrls = await clearApplicationFormData(existing.applicationId, tx);
  }

  await tx.application.update({
    where: { id: existing.applicationId },
    data: {
      status: nextStatus,
      ...(shouldClearForm
        ? {
            submittedAt: null,
            reviewedAt: null,
            reviewedById: null,
            reviewNote: null,
          }
        : {}),
    },
  });

  return formUploadUrls;
}
