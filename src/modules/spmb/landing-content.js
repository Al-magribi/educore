import { prisma } from "@/lib/db.js";
import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";
import { getPublicPaymentSettings } from "@/modules/payment/settings.js";
import { formatDateId, formatDateRange } from "@/modules/spmb/date-format.js";
import { listAdmissionPeriods } from "@/modules/spmb/periods.js";
import { getActiveAdmissionAcademicYear } from "@/modules/spmb/academic-years.js";
import { formatRupiah } from "@/modules/spmb/period-fees.js";

const DEFAULT_ID = "default";

function mergePage(page, isOpen) {
  const defaults = spmbLandingDefaults.page;
  const merged = { ...defaults, ...page };
  const defaultSections = defaults.sections ?? {};
  const pageSections = page?.sections ?? {};

  return {
    ...merged,
    sections: {
      schedule: { ...defaultSections.schedule, ...pageSections.schedule },
      flow: { ...defaultSections.flow, ...pageSections.flow },
      requirements: { ...defaultSections.requirements, ...pageSections.requirements },
      faq: { ...defaultSections.faq, ...pageSections.faq },
    },
    status: isOpen === false ? "closed" : merged.status ?? "open",
    statusLabel:
      merged.statusLabel ??
      (isOpen === false ? "Pendaftaran Ditutup" : defaults.statusLabel),
  };
}

function normalizeLandingRow(row) {
  if (!row) return null;

  const pageRaw = row.page && typeof row.page === "object" ? row.page : {};
  const isOpen = row.isOpen ?? pageRaw.status !== "closed";
  const academicYear =
    row.academicYear ?? pageRaw.academicYear ?? spmbLandingDefaults.page.academicYear;

  const { deadline: _deadline, ...pageWithoutDeadline } = pageRaw;
  const feesRaw = row.fees && typeof row.fees === "object" ? row.fees : spmbLandingDefaults.fees;
  const { registration: _registration, ...feesWithoutRegistration } = feesRaw;

  return {
    page: mergePage({ ...pageWithoutDeadline, academicYear }, isOpen),
    schedule: Array.isArray(row.schedule) ? row.schedule : spmbLandingDefaults.schedule,
    flow: Array.isArray(row.flow) ? row.flow : spmbLandingDefaults.flow,
    requirements: Array.isArray(row.requirements)
      ? row.requirements
      : spmbLandingDefaults.requirements,
    fees: feesWithoutRegistration,
    faq: Array.isArray(row.faq) ? row.faq : spmbLandingDefaults.faq,
    contact:
      row.contact && typeof row.contact === "object"
        ? row.contact
        : spmbLandingDefaults.contact,
    isOpen,
    academicYear,
    updatedAt: row.updatedAt ?? null,
  };
}

async function enrichLandingContent(content) {
  const [activeAcademicYear, periods, paymentSettings] = await Promise.all([
    getActiveAdmissionAcademicYear(),
    listAdmissionPeriods(),
    getPublicPaymentSettings(),
  ]);

  const activeYearPeriods = activeAcademicYear
    ? periods.filter((period) => period.academicYearId === activeAcademicYear.id)
    : [];

  const activePeriod = activeYearPeriods.find((period) => period.isActive);
  const registrationFee = paymentSettings?.registrationFee ?? 350000;
  const academicYearLabel =
    activeAcademicYear?.academicYear ?? content.page.academicYear ?? content.academicYear;

  return {
    ...content,
    page: {
      ...content.page,
      academicYear: academicYearLabel,
      deadline: activePeriod ? formatDateId(activePeriod.closesAt) : "",
      status: activeAcademicYear ? content.page.status ?? "open" : "closed",
      statusLabel: activeAcademicYear
        ? content.page.statusLabel ?? "Pendaftaran Dibuka"
        : "Pendaftaran Ditutup",
    },
    fees: {
      ...content.fees,
      registration: formatRupiah(registrationFee),
    },
    gelombang: activeYearPeriods.map((period) => ({
      id: period.id,
      name: period.name,
      academicYear: period.academicYear,
      dateRange: formatDateRange(period.opensAt, period.closesAt),
      isActive: period.isActive,
      financialFees: period.financialFees ?? { items: [], total: 0, title: "", note: "" },
    })),
    activeAcademicYear,
  };
}

export function getDefaultLandingContent() {
  return {
    page: spmbLandingDefaults.page,
    schedule: spmbLandingDefaults.schedule,
    flow: spmbLandingDefaults.flow,
    requirements: spmbLandingDefaults.requirements,
    fees: spmbLandingDefaults.fees,
    faq: spmbLandingDefaults.faq,
    contact: spmbLandingDefaults.contact,
    isOpen: true,
    academicYear: spmbLandingDefaults.page.academicYear,
  };
}

export async function getSpmbLandingContent() {
  const row = await prisma.spmbLandingContent.findUnique({ where: { id: DEFAULT_ID } });
  const content = normalizeLandingRow(row) ?? getDefaultLandingContent();
  return enrichLandingContent(content);
}

export async function upsertSpmbLandingContent(payload) {
  const page = payload.page && typeof payload.page === "object" ? payload.page : {};
  const isOpen =
    payload.isOpen !== undefined
      ? Boolean(payload.isOpen)
      : page.status !== "closed";

  const { deadline: _deadline, ...pageToSave } = page;
  const feesRaw = payload.fees && typeof payload.fees === "object" ? payload.fees : {};
  const { registration: _registration, ...feesToSave } = feesRaw;

  const data = {
    page: {
      ...pageToSave,
      status: isOpen ? "open" : "closed",
    },
    schedule: Array.isArray(payload.schedule) ? payload.schedule : [],
    flow: Array.isArray(payload.flow) ? payload.flow : [],
    requirements: Array.isArray(payload.requirements) ? payload.requirements : [],
    fees: feesToSave,
    faq: Array.isArray(payload.faq) ? payload.faq : [],
    contact: payload.contact && typeof payload.contact === "object" ? payload.contact : {},
    isOpen,
    academicYear: payload.academicYear ?? page.academicYear ?? null,
  };

  const row = await prisma.spmbLandingContent.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID, ...data },
    update: data,
  });

  const content = normalizeLandingRow(row);
  return enrichLandingContent(content);
}
