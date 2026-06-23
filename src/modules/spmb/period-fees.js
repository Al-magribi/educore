export const FEE_FREQUENCY_LABELS = {
  once: "Sekali",
  monthly: "Perbulan",
  yearly: "Pertahun",
};

export const FEE_FREQUENCIES = Object.keys(FEE_FREQUENCY_LABELS);

export const DEFAULT_FEE_ITEMS = [
  {
    id: "ipsp",
    label: "Iuran Pengembangan Sarana Pendidikan (IPSP)",
    frequency: "once",
    amount: 0,
  },
  {
    id: "spp",
    label: "Sumbangan Pengelolaan Pendidikan (SPP)",
    frequency: "monthly",
    amount: 0,
  },
  {
    id: "ipks",
    label: "Iuran Pengembangan Keterampilan Siswa (IPKS)",
    frequency: "yearly",
    amount: 0,
  },
  {
    id: "ikk",
    label: "Iuran Kegiatan Kesiswaan (IKK/OSIS)",
    frequency: "yearly",
    amount: 0,
  },
  {
    id: "mpls",
    label:
      "Iuran Kegiatan Awal Peserta Didik Baru Masa Pengenalan Sekolah (MPLS)",
    frequency: "once",
    amount: 0,
  },
  {
    id: "admin_supplies",
    label:
      "Pengadaan Perlengkapan Administrasi Kesiswaan (Pas Foto, Kartu Pelajar, Sampul, dan Laporan Pendidikan)",
    frequency: "once",
    amount: 0,
  },
  {
    id: "personal",
    label:
      "Biaya Pribadi Peserta Didik (Pakaian Seragam Sekolah, Jas Almamater, Rompi, dan Atribut)",
    frequency: "once",
    amount: 0,
  },
];

export const DEFAULT_WAVE_FEE_PRESETS = {
  gelombang1: {
    ipsp: 5_000_000,
    spp: 590_000,
    ipks: 580_000,
    ikk: 400_000,
    mpls: 550_000,
    admin_supplies: 525_000,
    personal: 900_000,
  },
  gelombang2: {
    ipsp: 6_500_000,
    spp: 590_000,
    ipks: 580_000,
    ikk: 400_000,
    mpls: 550_000,
    admin_supplies: 525_000,
    personal: 900_000,
  },
};

function slugifyFeeId(label) {
  return (
    String(label ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || `item_${Date.now()}`
  );
}

function ensureUniqueId(baseId, seenIds) {
  let id = baseId;
  let counter = 2;
  while (seenIds.has(id)) {
    id = `${baseId}_${counter++}`;
  }
  seenIds.add(id);
  return id;
}

export function createEmptyFeeItem(label = "") {
  const trimmed = label.trim();
  return {
    id: slugifyFeeId(trimmed || `item_${Date.now()}`),
    label: trimmed,
    frequency: "once",
    amount: 0,
  };
}

export function createFeeItemsFromPreset(preset = {}) {
  return DEFAULT_FEE_ITEMS.map((item) => ({
    ...item,
    amount: Number(preset[item.id] ?? item.amount) || 0,
  }));
}

export function normalizeFeeItems(input, { useDefaults = false } = {}) {
  const saved = Array.isArray(input?.items) ? input.items : Array.isArray(input) ? input : [];

  if (saved.length === 0 && useDefaults) {
    return DEFAULT_FEE_ITEMS.map((item) => ({ ...item }));
  }

  const seenIds = new Set();

  return saved.map((raw, index) => {
    const label = raw?.label?.trim() ?? "";
    const baseId = raw?.id?.trim() || slugifyFeeId(label || `item_${index + 1}`);
    const id = ensureUniqueId(baseId, seenIds);
    const frequency = FEE_FREQUENCIES.includes(raw?.frequency) ? raw.frequency : "once";

    return {
      id,
      label,
      frequency,
      amount: Math.max(0, Number(raw?.amount) || 0),
    };
  });
}

export function validateFeeItems(input) {
  const items = normalizeFeeItems(input);

  if (items.length === 0) {
    throw new Error("Minimal satu item persyaratan keuangan diperlukan");
  }

  for (const [index, item] of items.entries()) {
    if (!item.label) {
      throw new Error(`Uraian biaya baris ${index + 1} wajib diisi`);
    }
  }

  return items;
}

export function buildFinancialFeesPayload(input, { requireItems = true } = {}) {
  const fees = normalizeFinancialFees(input);

  if (requireItems && fees.items.length === 0) {
    throw new Error("Minimal satu item biaya diperlukan");
  }

  for (const [index, item] of fees.items.entries()) {
    if (!item.label) {
      throw new Error(`Uraian biaya baris ${index + 1} wajib diisi`);
    }
  }

  return fees;
}

export function calculateFeeTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + Math.max(0, Number(item?.amount) || 0), 0);
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka untuk input (tanpa prefix Rp), pemisah ribuan Indonesia. */
export function formatRupiahInput(amount) {
  const num = Math.max(0, Number(amount) || 0);
  return new Intl.NumberFormat("id-ID").format(num);
}

/** Parse teks input ke angka bulat (hanya digit). */
export function parseRupiahInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  return Math.max(0, Number(digits) || 0);
}

export const DEFAULT_FINANCIAL_TITLE = "Biaya Masuk Siswa Baru";

export function normalizeFinancialFees(input) {
  const raw = input && typeof input === "object" ? input : {};
  const items = normalizeFeeItems(raw);
  return {
    title: raw.title?.trim() || DEFAULT_FINANCIAL_TITLE,
    note: raw.note?.trim() || "",
    items,
    total: calculateFeeTotal(items),
  };
}

export function createDefaultFinancialFees() {
  return normalizeFinancialFees({ title: DEFAULT_FINANCIAL_TITLE, items: [] });
}

export function createTemplateFinancialFees() {
  return normalizeFinancialFees({
    title: DEFAULT_FINANCIAL_TITLE,
    items: DEFAULT_FEE_ITEMS.map((item) => ({ ...item, amount: 0 })),
  });
}
