import { prisma } from "@/lib/db.js";
import {
  decryptSecret,
  encryptSecret,
  isMaskedSecret,
  maskSecret,
} from "@/lib/secrets.js";

const SETTINGS_ID = "default";

function toPublicPaymentSettings(row) {
  if (!row) return null;
  return {
    registrationFee: row.registrationFee,
    manualEnabled: row.manualEnabled,
    manualInstructions: row.manualInstructions,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountName: row.bankAccountName,
    midtransEnabled: row.midtransEnabled,
    midtransClientKey: row.midtransClientKey,
    midtransMerchantId: row.midtransMerchantId,
    midtransProduction: row.midtransProduction,
    midtransServerKeySet: Boolean(row.midtransServerKey),
    updatedAt: row.updatedAt,
  };
}

function toAdminPaymentSettings(row) {
  if (!row) return null;
  return {
    ...toPublicPaymentSettings(row),
    midtransServerKey: row.midtransServerKey ? maskSecret(row.midtransServerKey) : "",
  };
}

/** Untuk halaman calon siswa — tanpa server key */
export async function getPublicPaymentSettings() {
  const row = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } });
  return toPublicPaymentSettings(row);
}

/** Untuk admin SPMB */
export async function getAdminPaymentSettings() {
  const row = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } });
  return toAdminPaymentSettings(row);
}

/** Untuk server (Midtrans API, webhook) — termasuk server key terdekripsi */
export async function getPaymentSettingsForServer() {
  const row = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return null;
  return {
    ...row,
    midtransServerKey: row.midtransServerKey
      ? decryptSecret(row.midtransServerKey)
      : null,
  };
}

export async function upsertPaymentSettings(data) {
  const existing = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } });

  let midtransServerKey = existing?.midtransServerKey ?? null;
  if (data.midtransServerKey !== undefined) {
    if (isMaskedSecret(data.midtransServerKey)) {
      // keep existing
    } else if (data.midtransServerKey === "" || data.midtransServerKey === null) {
      midtransServerKey = null;
    } else {
      midtransServerKey = encryptSecret(data.midtransServerKey);
    }
  }

  const row = await prisma.paymentSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      registrationFee: data.registrationFee ?? 350000,
      manualEnabled: data.manualEnabled ?? true,
      midtransEnabled: data.midtransEnabled ?? false,
      midtransServerKey,
      midtransClientKey: data.midtransClientKey ?? null,
      midtransMerchantId: data.midtransMerchantId ?? null,
      midtransProduction: data.midtransProduction ?? false,
      manualInstructions: data.manualInstructions ?? null,
      bankName: data.bankName ?? null,
      bankAccountNumber: data.bankAccountNumber ?? null,
      bankAccountName: data.bankAccountName ?? null,
    },
    update: {
      registrationFee: data.registrationFee,
      manualEnabled: data.manualEnabled,
      midtransEnabled: data.midtransEnabled,
      midtransServerKey,
      midtransClientKey: data.midtransClientKey,
      midtransMerchantId: data.midtransMerchantId,
      midtransProduction: data.midtransProduction,
      manualInstructions: data.manualInstructions,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
    },
  });

  return toAdminPaymentSettings(row);
}
