import { prisma } from "@/lib/db.js";
import { PAYMENT_STATUS } from "@/lib/constants.js";
import { getPublicSchoolBranding } from "@/modules/cms/school-settings.js";

const SETTINGS_ID = "default";

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

function formatAddress(school) {
  const parts = [
    school?.street,
    school?.district,
    [school?.city, school?.province].filter(Boolean).join(", "),
    school?.postalCode,
    school?.country,
  ].filter(Boolean);
  return parts.join("\n");
}

function buildInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV/${y}${m}${d}/${rand}`;
}

export async function getInvoiceSettingsForAdmin() {
  const row = await prisma.invoiceSettings.findUnique({ where: { id: SETTINGS_ID } });
  return {
    treasurerName: row?.treasurerName ?? "",
    treasurerSignatureUrl: row?.treasurerSignatureUrl ?? "",
    invoiceLogoUrl: row?.invoiceLogoUrl ?? "",
    invoiceSchoolName: row?.invoiceSchoolName ?? "",
    invoiceSchoolAddress: row?.invoiceSchoolAddress ?? "",
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}

/** Fallback header sekolah untuk pratinjau pengaturan invoice. */
export async function getInvoiceSchoolDefaults() {
  const [schoolBranding, school] = await Promise.all([
    getPublicSchoolBranding(),
    prisma.schoolSettings.findUnique({
      where: { id: "default" },
      select: {
        name: true,
        street: true,
        district: true,
        city: true,
        province: true,
        postalCode: true,
        country: true,
        logoUrl: true,
      },
    }),
  ]);

  return {
    logoUrl: schoolBranding.logoUrl || school?.logoUrl || "",
    schoolName: schoolBranding.name || school?.name || "Sekolah",
    schoolAddress: formatAddress(school) || "",
  };
}

export async function upsertInvoiceSettings(payload) {
  const data = {
    treasurerName: payload.treasurerName?.trim() || null,
    treasurerSignatureUrl: payload.treasurerSignatureUrl?.trim() || null,
    invoiceLogoUrl: payload.invoiceLogoUrl?.trim() || null,
    invoiceSchoolName: payload.invoiceSchoolName?.trim() || null,
    invoiceSchoolAddress: payload.invoiceSchoolAddress?.trim() || null,
  };

  const row = await prisma.invoiceSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  return {
    treasurerName: row.treasurerName ?? "",
    treasurerSignatureUrl: row.treasurerSignatureUrl ?? "",
    invoiceLogoUrl: row.invoiceLogoUrl ?? "",
    invoiceSchoolName: row.invoiceSchoolName ?? "",
    invoiceSchoolAddress: row.invoiceSchoolAddress ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveInvoiceHeader() {
  const [invoiceSettings, schoolBranding, school] = await Promise.all([
    prisma.invoiceSettings.findUnique({ where: { id: SETTINGS_ID } }),
    getPublicSchoolBranding(),
    prisma.schoolSettings.findUnique({
      where: { id: "default" },
      select: {
        name: true,
        street: true,
        district: true,
        city: true,
        province: true,
        postalCode: true,
        country: true,
        logoUrl: true,
      },
    }),
  ]);

  const logoUrl =
    invoiceSettings?.invoiceLogoUrl?.trim() ||
    schoolBranding.logoUrl ||
    school?.logoUrl ||
    "";

  const schoolName =
    invoiceSettings?.invoiceSchoolName?.trim() ||
    schoolBranding.name ||
    school?.name ||
    "Sekolah";

  const schoolAddress =
    invoiceSettings?.invoiceSchoolAddress?.trim() || formatAddress(school) || "";

  return {
    logoUrl,
    schoolName,
    schoolAddress,
    treasurerName: invoiceSettings?.treasurerName ?? "",
    treasurerSignatureUrl: invoiceSettings?.treasurerSignatureUrl ?? "",
  };
}

function mapPaymentLineItems(payment) {
  const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
  const feeItems = Array.isArray(metadata.feeItems) ? metadata.feeItems : [];
  const paymentMode = metadata.paymentMode;

  if (feeItems.length > 0) {
    const installmentPrefix = paymentMode === "installment" ? "Cicilan — " : "";
    return feeItems.map((item) => ({
      label: `${installmentPrefix}${item.label ?? "Biaya"}`,
      amount: Number(item.amount) || 0,
    }));
  }

  if (payment.category === "wave_fee" && paymentMode === "installment") {
    return [{ label: "Cicilan Pembayaran Gelombang Aktif", amount: payment.amount }];
  }

  const categoryLabel =
    payment.category === "wave_fee" ? "Pembayaran Gelombang Aktif" : "Biaya Formulir Pendaftaran";

  return [{ label: categoryLabel, amount: payment.amount }];
}

export async function getInvoiceData(paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      category: true,
      amount: true,
      status: true,
      method: true,
      paidAt: true,
      invoiceNumber: true,
      invoiceIssuedAt: true,
      metadata: true,
      createdAt: true,
      application: {
        select: {
          id: true,
          period: {
            select: { name: true, academicYear: true },
          },
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
      },
    },
  });

  if (!payment) throw new Error("Pembayaran tidak ditemukan");
  if (payment.status !== PAYMENT_STATUS.PAID) {
    throw new Error("Invoice hanya dapat diterbitkan untuk pembayaran yang sudah lunas");
  }

  const header = await resolveInvoiceHeader();

  return {
    invoiceNumber: payment.invoiceNumber,
    invoiceIssuedAt: formatDateTime(payment.invoiceIssuedAt ?? payment.paidAt),
    payment: {
      id: payment.id,
      category: payment.category,
      amount: payment.amount,
      method: payment.method,
      paidAt: formatDateTime(payment.paidAt),
    },
    applicant: {
      name: payment.application.user.name,
      email: payment.application.user.email,
      phone: payment.application.user.phone ?? "—",
    },
    period: {
      name: payment.application.period.name,
      academicYear: payment.application.period.academicYear,
    },
    lineItems: mapPaymentLineItems(payment),
    header,
  };
}

export async function issueInvoice(paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, invoiceNumber: true },
  });

  if (!payment) throw new Error("Pembayaran tidak ditemukan");
  if (payment.status !== PAYMENT_STATUS.PAID) {
    throw new Error("Invoice hanya dapat diterbitkan untuk pembayaran yang sudah lunas");
  }

  if (payment.invoiceNumber) {
    return getInvoiceData(paymentId);
  }

  let invoiceNumber = buildInvoiceNumber();
  let attempts = 0;

  while (attempts < 5) {
    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          invoiceNumber,
          invoiceIssuedAt: new Date(),
        },
      });
      break;
    } catch {
      invoiceNumber = buildInvoiceNumber();
      attempts += 1;
    }
  }

  return getInvoiceData(paymentId);
}
