import { PAYMENT_STATUS } from "@/lib/constants.js";
import { resolvePeriodFinancialFees } from "@/modules/spmb/fee-items.js";

export function areWavePaymentsWithinDeadline(wavePayments, periodClosesAt) {
  if (!periodClosesAt) return true;

  const deadline = new Date(periodClosesAt);
  if (Number.isNaN(deadline.getTime())) return true;

  const paidPayments = (wavePayments ?? []).filter(
    (payment) => payment.status === PAYMENT_STATUS.PAID && payment.paidAt
  );

  if (paidPayments.length === 0) return false;

  return paidPayments.every((payment) => new Date(payment.paidAt) <= deadline);
}

export function isPeriodPaymentOpen(periodClosesAt, now = new Date()) {
  if (!periodClosesAt) return true;

  const deadline = new Date(periodClosesAt);
  if (Number.isNaN(deadline.getTime())) return true;

  return now <= deadline;
}

export function isWaveEnrollmentComplete(waveSummary, wavePayments, periodClosesAt) {
  return (
    Boolean(waveSummary?.isFullyPaid) &&
    areWavePaymentsWithinDeadline(wavePayments, periodClosesAt)
  );
}

export function resolveWaveEnrollmentStatus(waveSummary, wavePayments, periodClosesAt) {
  if (!waveSummary || waveSummary.paidCount === 0) {
    return { status: "none", statusLabel: "Belum bayar" };
  }

  if (isWaveEnrollmentComplete(waveSummary, wavePayments, periodClosesAt)) {
    return { status: "enrolled", statusLabel: "Masuk Gelombang" };
  }

  if (waveSummary.isFullyPaid) {
    return { status: "late", statusLabel: "Lunas (lewat batas)" };
  }

  return { status: "installment", statusLabel: "Cicilan" };
}

export function collectPaidFeeItemIds(payments) {
  const paidIds = new Set();

  for (const payment of payments ?? []) {
    if (payment.status !== PAYMENT_STATUS.PAID) continue;
    const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
    const ids = Array.isArray(metadata.feeItemIds) ? metadata.feeItemIds : [];
    for (const id of ids) {
      if (id) paidIds.add(id);
    }
  }

  return paidIds;
}

export function buildWaveFeeSummary(feeItems, wavePayments) {
  const paidIds = collectPaidFeeItemIds(wavePayments);
  const items = (feeItems?.items ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    frequency: item.frequency,
    amount: item.amount,
    isPaid: paidIds.has(item.id),
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = items.filter((item) => item.isPaid).reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const remainingItems = items.filter((item) => !item.isPaid);
  const isFullyPaid = remainingItems.length === 0 && items.length > 0;

  return {
    title: feeItems?.title ?? "Biaya Masuk Siswa Baru",
    note: feeItems?.note ?? "",
    items,
    totalAmount,
    paidAmount,
    remainingAmount,
    remainingItems,
    isFullyPaid,
    paidCount: items.filter((item) => item.isPaid).length,
    totalCount: items.length,
  };
}

export async function getActivePeriodWaveFees(periodId) {
  if (!periodId) return buildWaveFeeSummary({ items: [] }, []);
  const feeItems = await resolvePeriodFinancialFees(periodId);
  return feeItems;
}

export function validateSelectedFeeItems(selectedIds, remainingItems) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    throw new Error("Pilih minimal satu item biaya untuk dibayar");
  }

  const remainingMap = new Map(remainingItems.map((item) => [item.id, item]));
  const selected = [];

  for (const id of selectedIds) {
    const item = remainingMap.get(id);
    if (!item) throw new Error("Item biaya tidak valid atau sudah dibayar");
    selected.push(item);
  }

  const amount = selected.reduce((sum, item) => sum + item.amount, 0);
  if (amount <= 0) throw new Error("Nominal pembayaran tidak valid");

  return {
    feeItems: selected,
    feeItemIds: selected.map((item) => item.id),
    amount,
    paymentMode: selected.length === remainingItems.length ? "full" : "installment",
  };
}
