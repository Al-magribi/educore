"use client";

import { useState } from "react";
import Link from "next/link";
import { InvoiceDocument } from "@/components/spmb-admin/pembayaran/InvoiceDocument.jsx";

export function InvoicePrintView({ initialInvoice, paymentId }) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleIssue = async () => {
    setIssuing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/payments/${paymentId}/invoice`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menerbitkan invoice");
      setInvoice(data.invoice);
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIssuing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/spmb-admin/pembayaran"
            className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
          >
            ← Kembali ke pembayaran
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Invoice Pembayaran</h1>
          <p className="mt-1 text-sm text-slate-600">
            {invoice.applicant.name} · {invoice.period.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!invoice.invoiceNumber ? (
            <button
              type="button"
              onClick={handleIssue}
              disabled={issuing}
              className="rounded-xl bg-[var(--admin-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {issuing ? "Menerbitkan..." : "Terbitkan Invoice"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cetak / PDF
            </button>
          )}
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm print:hidden ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <InvoiceDocument invoice={invoice} />

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          article,
          article * {
            visibility: visible;
          }
          article {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
