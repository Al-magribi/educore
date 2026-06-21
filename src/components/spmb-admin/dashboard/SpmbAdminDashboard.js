import Link from "next/link";
import { prisma } from "@/lib/db.js";

export const dynamic = "force-dynamic";

const statusLabels = {
  draft: "Draft",
  pending_payment: "Menunggu bayar",
  paid: "Sudah bayar",
  form_in_progress: "Mengisi form",
  submitted: "Diajukan",
  under_review: "Review",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const toneClasses = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
};

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value ?? 0);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

async function getDashboardData() {
  const [
    activePeriod,
    applicationGroups,
    latestApplications,
    formCount,
    testCount,
    paymentSettings,
  ] = await Promise.all([
    prisma.admissionPeriod.findFirst({
      where: { isActive: true },
      orderBy: { opensAt: "desc" },
    }),
    prisma.application.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.formDefinition.count({ where: { isActive: true } }),
    prisma.questionnaire.count({ where: { isActive: true } }),
    prisma.paymentSettings.findUnique({ where: { id: "default" } }),
  ]);

  return {
    activePeriod,
    applicationGroups,
    latestApplications,
    formCount,
    testCount,
    paymentSettings,
  };
}

function getCountByStatus(groups, status) {
  return groups.find((item) => item.status === status)?._count?._all ?? 0;
}

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function ActionLink({ href, title, description }) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <span className="mt-0.5 text-slate-400 transition group-hover:text-slate-700" aria-hidden>
        →
      </span>
    </Link>
  );
}

export default async function SpmbAdminDashboard() {
  const data = await getDashboardData();
  const totalApplications = data.applicationGroups.reduce((sum, item) => sum + item._count._all, 0);
  const submitted = getCountByStatus(data.applicationGroups, "submitted");
  const underReview = getCountByStatus(data.applicationGroups, "under_review");
  const accepted = getCountByStatus(data.applicationGroups, "accepted");
  const pendingPayment = getCountByStatus(data.applicationGroups, "pending_payment");

  const periodName = data.activePeriod?.name ?? "Belum ada periode aktif";
  const academicYear = data.activePeriod?.academicYear ?? "—";

  return (
    <div className="space-y-8 pb-4">
      <section
        className="overflow-hidden rounded-[28px] border border-slate-200 shadow-sm"
        style={{
          background:
            "linear-gradient(135deg, var(--admin-primary) 0%, var(--admin-secondary) 55%, var(--admin-accent) 100%)",
          color: "var(--admin-primary-foreground)",
        }}
      >
        <div className="grid gap-8 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] xl:items-end">
          <div>
            <p
              className="text-sm font-medium"
              style={{
                color: "color-mix(in srgb, var(--admin-primary-foreground) 78%, transparent)",
              }}
            >
              Dashboard SPMB
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
              {periodName}
            </h1>
            <p
              className="mt-3 max-w-2xl text-sm leading-6 md:text-base"
              style={{
                color: "color-mix(in srgb, var(--admin-primary-foreground) 84%, transparent)",
              }}
            >
              Tahun ajaran {academicYear}. Kelola formulir pendaftaran, tes calon siswa, dan
              proses seleksi dari satu panel.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: "color-mix(in srgb, white 22%, transparent)",
                  backgroundColor: "color-mix(in srgb, white 10%, transparent)",
                }}
              >
                {formatNumber(totalApplications)} pendaftar
              </span>
              <span
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: "color-mix(in srgb, white 22%, transparent)",
                  backgroundColor: "color-mix(in srgb, white 10%, transparent)",
                }}
              >
                {formatNumber(data.formCount)} formulir aktif
              </span>
              <span
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: "color-mix(in srgb, white 22%, transparent)",
                  backgroundColor: "color-mix(in srgb, white 10%, transparent)",
                }}
              >
                {formatNumber(data.testCount)} tes aktif
              </span>
            </div>
          </div>

          <div
            className="rounded-3xl p-5 shadow-lg"
            style={{
              backgroundColor: "color-mix(in srgb, white 14%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p
              className="text-sm"
              style={{
                color: "color-mix(in srgb, var(--admin-primary-foreground) 72%, transparent)",
              }}
            >
              Perlu tindakan
            </p>
            <p className="mt-2 text-xl font-semibold">
              {underReview + submitted > 0
                ? `${formatNumber(underReview + submitted)} berkas perlu review`
                : pendingPayment > 0
                  ? `${formatNumber(pendingPayment)} menunggu pembayaran`
                  : "Semua berkas terpantau"}
            </p>
            <p
              className="mt-2 text-sm"
              style={{
                color: "color-mix(in srgb, var(--admin-primary-foreground) 78%, transparent)",
              }}
            >
              {data.activePeriod
                ? `Pendaftaran ${formatDate(data.activePeriod.opensAt)} – ${formatDate(data.activePeriod.closesAt)}`
                : "Atur periode penerimaan di pengaturan."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total pendaftar"
          value={formatNumber(totalApplications)}
          description="Semua status pendaftaran periode aktif"
        />
        <StatCard
          label="Diajukan / review"
          value={formatNumber(submitted + underReview)}
          description="Berkas siap atau sedang dinilai admin"
        />
        <StatCard
          label="Diterima"
          value={formatNumber(accepted)}
          description="Calon siswa yang lolos seleksi"
        />
        <StatCard
          label="Biaya formulir"
          value={
            data.paymentSettings?.registrationFee
              ? `Rp ${formatNumber(data.paymentSettings.registrationFee)}`
              : "Belum diatur"
          }
          description="Konfigurasi di menu pengaturan"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Pendaftaran terbaru</h2>
              <p className="mt-1 text-sm text-slate-600">Aktivitas calon siswa terakhir.</p>
            </div>
            <Link
              href="/spmb-admin/pendaftaran"
              className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Lihat semua
            </Link>
          </div>

          <div className="mt-6 grid gap-3">
            {data.latestApplications.length > 0 ? (
              data.latestApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{app.user.name}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{app.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        app.status === "accepted"
                          ? toneClasses.emerald
                          : app.status === "pending_payment"
                            ? toneClasses.amber
                            : toneClasses.slate
                      }`}
                    >
                      {statusLabels[app.status] ?? app.status}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(app.updatedAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Belum ada pendaftaran masuk.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Aksi cepat</h2>
            <div className="mt-4 grid gap-3">
              <ActionLink
                href="/spmb-admin/formulir"
                title="Formulir pendaftaran"
                description="Buat field custom untuk calon siswa."
              />
              <ActionLink
                href="/spmb-admin/test"
                title="Tes & scoring"
                description="Kepribadian, gaya belajar, dan tes custom."
              />
              <ActionLink
                href="/spmb-admin/pendaftaran"
                title="Kelola pendaftaran"
                description="Review, terima, atau tolak berkas."
              />
              <ActionLink
                href="/spmb-admin/pengaturan"
                title="Pengaturan SPMB"
                description="Pembayaran, SMTP, dan konfigurasi sistem."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
