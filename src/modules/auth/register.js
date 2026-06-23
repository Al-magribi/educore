import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ROLES } from "@/config/roles.js";
import { prisma } from "@/lib/db.js";
import {
  sendEmail,
  buildVerificationEmailHtml,
  buildVerificationEmailText,
  getSchoolBrandingForEmail,
} from "@/modules/mail/index.js";

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode() {
  const max = 10 ** CODE_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(CODE_LENGTH, "0");
}

function codeExpiresAt() {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
}

async function createAndSendCode(user) {
  const code = generateCode();
  const expiresAt = codeExpiresAt();

  await prisma.$transaction([
    prisma.emailVerificationCode.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerificationCode.create({
      data: { userId: user.id, code, expiresAt },
    }),
  ]);

  const branding = await getSchoolBrandingForEmail();

  await sendEmail({
    to: user.email,
    subject: `Kode Verifikasi Email — ${branding.name}`,
    html: buildVerificationEmailHtml({
      schoolName: branding.name,
      schoolTagline: branding.tagline,
      logoUrl: branding.logoUrl,
      hasLogo: branding.hasLogo,
      recipientName: user.name,
      code,
      expiresMinutes: CODE_TTL_MINUTES,
    }),
    text: buildVerificationEmailText({
      schoolName: branding.name,
      schoolTagline: branding.tagline,
      recipientName: user.name,
      code,
      expiresMinutes: CODE_TTL_MINUTES,
    }),
  });

  return { expiresAt };
}

export async function registerApplicant({ name, email, phone, password }) {
  const trimmedName = name?.trim();
  const normalizedEmail = email?.trim()?.toLowerCase();
  const trimmedPhone = phone?.trim() || null;

  if (!trimmedName) throw new Error("Nama wajib diisi");
  if (!normalizedEmail) throw new Error("Email wajib diisi");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Format email tidak valid");
  }
  if (!password) throw new Error("Password wajib diisi");
  if (password.length < 8) throw new Error("Password minimal 8 karakter");

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true, emailVerifiedAt: true },
  });

  if (existing?.emailVerifiedAt) {
    throw new Error("Email sudah terdaftar");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: trimmedName,
        phone: trimmedPhone,
        passwordHash,
        role: ROLES.APPLICANT,
      },
      select: { id: true, email: true, name: true },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        passwordHash,
        role: ROLES.APPLICANT,
      },
      select: { id: true, email: true, name: true },
    });
  }

  await createAndSendCode(user);

  return { email: user.email };
}

export async function verifyEmailCode({ email, code }) {
  const normalizedEmail = email?.trim()?.toLowerCase();
  const normalizedCode = code?.trim();

  if (!normalizedEmail || !normalizedCode) {
    throw new Error("Email dan kode verifikasi wajib diisi");
  }
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("Kode verifikasi harus 6 digit");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, emailVerifiedAt: true },
  });

  if (!user) throw new Error("Akun tidak ditemukan");
  if (user.emailVerifiedAt) {
    return { alreadyVerified: true };
  }

  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id, code: normalizedCode },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new Error("Kode verifikasi salah");
  if (record.expiresAt < new Date()) {
    throw new Error("Kode verifikasi sudah kedaluwarsa. Kirim ulang kode baru.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationCode.deleteMany({ where: { userId: user.id } }),
  ]);

  return { verified: true };
}

export async function resendVerificationCode({ email }) {
  const normalizedEmail = email?.trim()?.toLowerCase();
  if (!normalizedEmail) throw new Error("Email wajib diisi");

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });

  if (!user) throw new Error("Akun tidak ditemukan");
  if (user.emailVerifiedAt) throw new Error("Email sudah diverifikasi");

  const latest = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      throw new Error(`Tunggu ${wait} detik sebelum mengirim ulang`);
    }
  }

  await createAndSendCode(user);

  return { sent: true };
}
