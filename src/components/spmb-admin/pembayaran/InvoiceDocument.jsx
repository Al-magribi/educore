'use client';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

const methodLabels = {
  manual: 'Transfer Bank',
  midtrans: 'Pembayaran Online (Midtrans)',
  cash: 'Tunai (Loket Sekolah)',
};

const categoryLabels = {
  registration: 'Biaya Formulir Pendaftaran',
  wave_fee: 'Pembayaran Gelombang Aktif',
};

export function InvoiceDocument({ invoice, printMode = false, compact = false }) {
  if (!invoice) return null;

  const wrapperClass = printMode
    ? 'mx-auto max-w-[210mm] bg-white p-8 text-slate-900'
    : compact
      ? 'w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm'
      : 'mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8';

  return (
    <article className={wrapperClass}>
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          {invoice.header.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invoice.header.logoUrl}
              alt="Logo sekolah"
              className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-500">
              S
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-slate-900">
              <span className="text-xl font-bold tracking-tight">{invoice.header.schoolName}</span>
            </p>
            <p className="text-sm text-slate-600">{invoice.header.schoolAddress}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{invoice.invoiceNumber ?? '—'}</p>
          <p className="mt-1 text-sm text-slate-600">{invoice.invoiceIssuedAt ?? '—'}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diterima dari</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{invoice.applicant.name}</p>
          <p className="text-sm text-slate-600">{invoice.applicant.email}</p>
          <p className="text-sm text-slate-600">{invoice.applicant.phone}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detail pembayaran</p>
          <p className="mt-3 text-sm text-slate-600">
            Kategori: {categoryLabels[invoice.payment.category] ?? invoice.payment.category}
          </p>
          <p className="text-sm text-slate-600">
            Metode: {methodLabels[invoice.payment.method] ?? invoice.payment.method}
          </p>
          {invoice.payment.paidAt ? <p className="text-sm text-slate-600">Dibayar: {invoice.payment.paidAt}</p> : null}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Uraian</th>
              <th className="px-4 py-3 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, index) => (
              <tr key={`${item.label}-${index}`} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">{item.label}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">{formatRupiah(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-4 text-right font-semibold text-slate-700">Total</td>
              <td className="px-4 py-4 text-right text-lg font-bold text-slate-900">
                {formatRupiah(invoice.payment.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer className="mt-10 flex flex-col items-end gap-4">
        <div className="text-center">
          <p className="text-sm text-slate-600">Bendahara</p>
          {invoice.header.treasurerSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invoice.header.treasurerSignatureUrl}
              alt="Tanda tangan bendahara"
              className="mx-auto mt-2 h-16 object-contain"
            />
          ) : (
            <div className="mx-auto mt-6 h-16 w-40 border-b border-slate-300" />
          )}
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {invoice.header.treasurerName || '(Nama bendahara)'}
          </p>
        </div>
      </footer>
    </article>
  );
}
