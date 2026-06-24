const STATUS_LABELS = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  failed: "Gagal / ditolak",
  manual_review: "Menunggu verifikasi admin",
};

export function PaymentStatus({ status = "pending" }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="text-sm text-zinc-600">Status pembayaran</p>
      <p className="mt-1 font-semibold">{STATUS_LABELS[status] ?? status}</p>
    </div>
  );
}

export { STATUS_LABELS as PAYMENT_STATUS_LABELS };
