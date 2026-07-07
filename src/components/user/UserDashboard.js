import Link from "next/link";
import { userMenuItems } from "./nav-config.js";

const toneClasses = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
};

const menuStatusConfig = {
  done: { label: "Selesai", className: "bg-emerald-50 text-emerald-700" },
  in_progress: { label: "Berlangsung", className: "bg-blue-50 text-blue-700" },
  pending: { label: "Perlu dilakukan", className: "bg-amber-50 text-amber-800" },
  locked: { label: "Belum tersedia", className: "bg-slate-100 text-slate-500" },
  optional: { label: "Opsional", className: "bg-slate-100 text-slate-500" },
};

const menuStatusKeys = {
  "/spmb/pembayaran": "pembayaran",
  "/spmb/formulir": "formulir",
  "/spmb/kuesioner": "kuesioner",
};

function StatusBadge({ tone, label }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses[tone] ?? toneClasses.slate}`}
    >
      {label}
    </span>
  );
}

function MenuCard({ item, status }) {
  const Icon = item.icon;
  const statusInfo = menuStatusConfig[status] ?? menuStatusConfig.pending;

  return (
    <Link
      href={item.href}
      className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{item.label}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Buka menu
        <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

function StepItem({ step, title, done, active }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? "✓" : step}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={`text-sm font-medium ${done || active ? "text-slate-900" : "text-slate-500"}`}>
          {title}
        </p>
      </div>
    </li>
  );
}

export function UserDashboard({ userName, data }) {
  const { school, activePeriod, application, menuStatus } = data;
  const status = application?.status ?? "draft";

  const steps = [
    {
      title: "Pembayaran formulir",
      done: menuStatus.pembayaran === "done",
      active: menuStatus.pembayaran !== "done",
    },
    {
      title: "Isi formulir pendaftaran",
      done: menuStatus.formulir === "done",
      active: menuStatus.formulir === "in_progress" || menuStatus.formulir === "pending",
    },
    {
      title:
        menuStatus.kuesioner === "optional" ? "Kuesioner (opsional)" : "Kuesioner",
      done: menuStatus.kuesioner === "done",
      active: menuStatus.kuesioner === "pending",
    },
    {
      title: "Pengumuman hasil",
      done: status === "accepted" || status === "rejected",
      active: status === "under_review" || status === "submitted",
    },
  ];

  const firstName = userName?.split(" ")[0] ?? "Calon Siswa";

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-primary via-secondary to-accent p-6 text-primary-foreground shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">Portal Pendaftaran SPMB</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Halo, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
              Kelola pembayaran, formulir, dan kuesioner dari satu tempat.
              Pantau status pendaftaran Anda kapan saja.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Status pendaftaran</p>
            {application ? (
              <div className="mt-2 space-y-1">
                <p className="text-lg font-semibold">
                  {application.statusLabel}
                </p>
                {application.periodName ? (
                  <p className="text-sm text-white/80">
                    {application.periodName} · {application.academicYear}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-lg font-semibold">Belum memulai pendaftaran</p>
            )}
          </div>
        </div>

        {activePeriod ? (
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
              Gelombang: {activePeriod.name}
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
              Tutup: {activePeriod.closesAt ?? "—"}
            </span>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90">
            Periode pendaftaran belum dibuka oleh sekolah. Silakan cek kembali nanti atau hubungi admin SPMB.
          </p>
        )}
      </section>

      {application ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Periode</p>
            <p className="mt-2 font-semibold text-slate-900">{application.periodName ?? "—"}</p>
            <p className="mt-1 text-sm text-slate-600">{application.academicYear ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Status</p>
            <div className="mt-2">
              <StatusBadge tone={application.statusTone} label={application.statusLabel} />
            </div>
            {application.submittedAt ? (
              <p className="mt-2 text-sm text-slate-600">Diajukan: {application.submittedAt}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-sm text-slate-500">Pembayaran terakhir</p>
            {application.latestPayment ? (
              <>
                <p className="mt-2 font-semibold text-slate-900">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(application.latestPayment.amount)}
                </p>
                <p className="mt-1 text-sm capitalize text-slate-600">
                  {application.latestPayment.status.replace("_", " ")}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Belum ada pembayaran</p>
            )}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Menu Pendaftaran</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ikuti urutan menu berikut untuk menyelesaikan pendaftaran {school.name}.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {userMenuItems.map((item) => (
            <MenuCard
              key={item.href}
              item={item}
              status={menuStatus[menuStatusKeys[item.href]] ?? "pending"}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Alur Pendaftaran</h2>
          <p className="mt-1 text-sm text-slate-600">
            Selesaikan setiap langkah secara berurutan agar berkas Anda dapat diverifikasi.
          </p>
          <ol className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <StepItem
                key={step.title}
                step={index + 1}
                title={step.title}
                done={step.done}
                active={step.active && !step.done}
              />
            ))}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Butuh bantuan?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Kunjungi halaman informasi SPMB untuk jadwal, persyaratan dokumen, dan pertanyaan yang sering diajukan.
            </p>
            <Link
              href="/spmb"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Lihat Info SPMB
              <span aria-hidden>→</span>
            </Link>
          </div>

          {!application && activePeriod ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="font-semibold text-slate-900">Mulai pendaftaran</h3>
              <p className="mt-2 text-sm text-slate-600">
                Langkah pertama adalah melakukan pembayaran biaya formulir pendaftaran.
              </p>
              <Link
                href="/spmb/pembayaran"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Ke Pembayaran
                <span aria-hidden>→</span>
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
