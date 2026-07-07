export const statusLabels = {
  draft: "Draft",
  pending_payment: "Menunggu bayar",
  paid: "Sudah bayar",
  form_in_progress: "Mengisi form",
  submitted: "Diajukan",
  under_review: "Review",
  accepted: "Diterima",
  rejected: "Ditolak",
};

export const statusTone = {
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
  pending_payment: "bg-amber-50 text-amber-800 ring-amber-200",
  paid: "bg-teal-50 text-teal-800 ring-teal-200",
  form_in_progress: "bg-sky-50 text-sky-800 ring-sky-200",
  submitted: "bg-blue-50 text-blue-800 ring-blue-200",
  under_review: "bg-violet-50 text-violet-800 ring-violet-200",
};

export const RESETTABLE_STATUSES = new Set([
  "accepted",
  "rejected",
  "under_review",
  "form_in_progress",
]);

export function getFormEditLabel(status) {
  if (status === "form_in_progress") return "Lanjutkan formulir";
  if (status === "paid" || status === "pending_payment" || status === "draft") {
    return "Isi formulir";
  }
  return "Edit formulir";
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generatePassword(length = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
