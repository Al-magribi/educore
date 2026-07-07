import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ROLES } from "@/config/roles.js";
import { prisma } from "@/lib/db.js";
import { APPLICATION_STATUS, PAYMENT_STATUS } from "@/lib/constants.js";
import { getPublicPaymentSettings } from "@/modules/payment/settings.js";
import { mapApplication } from "@/modules/spmb/applications.js";

function generatePassword(length = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
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

export async function getManualRegistrationSetup() {
  const [activePeriod, settings] = await Promise.all([
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
    getPublicPaymentSettings(),
  ]);

  return {
    activePeriod: activePeriod
      ? {
          id: activePeriod.id,
          name: activePeriod.name,
          academicYear: activePeriod.academicYear,
          closesAt: formatDateTime(activePeriod.closesAt),
        }
      : null,
    registrationFee: settings?.registrationFee ?? 350000,
  };
}

export async function createManualApplication({ adminId, applicant, payment = {} }) {
  const trimmedName = applicant?.name?.trim();
  const normalizedEmail = applicant?.email?.trim()?.toLowerCase();
  const trimmedPhone = applicant?.phone?.trim() || null;
  const password = applicant?.password?.trim() || generatePassword();
  const note = payment?.note?.trim() || null;
  const receiptNo = payment?.receiptNo?.trim() || null;

  if (!trimmedName) throw new Error("Nama wajib diisi");
  if (!normalizedEmail) throw new Error("Email wajib diisi");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Format email tidak valid");
  }
  if (password.length < 8) throw new Error("Password minimal 8 karakter");

  const setup = await getManualRegistrationSetup();
  if (!setup.activePeriod) {
    throw new Error("Tidak ada periode pendaftaran aktif");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      emailVerifiedAt: true,
      applications: {
        where: { periodId: setup.activePeriod.id },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (existingUser?.applications.length > 0) {
    throw new Error("Pendaftar sudah memiliki pendaftaran untuk periode aktif ini");
  }

  if (existingUser?.emailVerifiedAt) {
    const otherApp = await prisma.application.findFirst({
      where: { userId: existingUser.id },
      select: { id: true },
    });
    if (otherApp) {
      throw new Error("Email sudah terdaftar dengan pendaftaran lain");
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const amount = setup.registrationFee;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let userId;

    if (existingUser) {
      const user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: trimmedName,
          phone: trimmedPhone,
          passwordHash,
          role: ROLES.APPLICANT,
          emailVerifiedAt: now,
        },
        select: { id: true, name: true, email: true, phone: true },
      });
      userId = user.id;
    } else {
      const user = await tx.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          phone: trimmedPhone,
          passwordHash,
          role: ROLES.APPLICANT,
          emailVerifiedAt: now,
        },
        select: { id: true, name: true, email: true, phone: true },
      });
      userId = user.id;
    }

    const application = await tx.application.create({
      data: {
        userId,
        periodId: setup.activePeriod.id,
        status: APPLICATION_STATUS.PAID,
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        user: {
          select: { name: true, email: true, phone: true },
        },
        answers: {
          select: { fieldId: true, value: true },
        },
      },
    });

    await tx.payment.create({
      data: {
        applicationId: application.id,
        category: "registration",
        amount,
        method: "cash",
        status: PAYMENT_STATUS.PAID,
        paidAt: now,
        metadata: {
          source: "admin_walk_in",
          createdByAdminId: adminId,
          note,
          receiptNo,
        },
      },
    });

    return { application, user: application.user };
  });

  return {
    application: mapApplication(result.application),
    credentials: {
      email: normalizedEmail,
      password,
    },
    message: "Pendaftaran manual berhasil dibuat",
  };
}
