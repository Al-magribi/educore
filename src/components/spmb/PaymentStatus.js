const STATUS_LABELS = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  failed: "Gagal",
  manual_review: "Menunggu verifikasi manual",
};

export function PaymentStatus({ status = "pending" }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="text-sm text-zinc-600">Status pembayaran</p>
      <p className="mt-1 font-semibold">{STATUS_LABELS[status] ?? status}</p>
    </div>
  );
}
