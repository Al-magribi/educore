import Link from "next/link";
import { prisma } from "@/lib/db.js";

export const dynamic = "force-dynamic";

const homeSectionLabels = {
  hero: "Hero",
  achievements: "Prestasi",
  extracurricular: "Ekstrakurikuler",
  alumni_testimonials: "Testimoni Alumni",
  spmb_cta: "Kartu SPMB",
  contact: "Kontak",
};

const toneClasses = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value ?? 0);
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getCountByStatus(groups, status) {
  return groups.find((item) => item.status === status)?._count?._all ?? 0;
}

function getCountByGroupValue(groups, key, value) {
  return groups.find((item) => item[key] === value)?._count?._all ?? 0;
}

function getCompleteness(record, fields) {
  if (!record) return 0;
  const filled = fields.filter((field) => {
    const value = record[field];
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

async function getDashboardData() {
  const [
    school,
    aboutPage,
    homeSections,
    homeSectionItemsCount,
    newsStatusGroups,
    latestNews,
    publishedNews,
    featuredNews,
    usersByRole,
  ] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { id: "default" } }),
    prisma.aboutPage.findUnique({
      where: { id: "default" },
      select: {
        pageTitle: true,
        pageSubtitle: true,
        profileTitle: true,
        profileParagraphs: true,
        visionContent: true,
        missionItems: true,
        valuesItems: true,
        updatedAt: true,
      },
    }),
    prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        type: true,
        isPublished: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.homeSectionItem.count(),
    prisma.newsPost.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.newsPost.findMany({
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        updatedAt: true,
        publishedAt: true,
      },
    }),
    prisma.newsPost.count({ where: { status: "published" } }),
    prisma.newsPost.count({ where: { status: "published", featured: true } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
  ]);

  return {
    school,
    aboutPage,
    homeSections,
    homeSectionItemsCount,
    newsStatusGroups,
    latestNews,
    publishedNews,
    featuredNews,
    usersByRole,
  };
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

function ContentStatusCard({ title, status, description, updatedAt }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-900">{title}</p>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
            status.tone === "emerald" ? toneClasses.emerald : toneClasses.slate
          }`}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {updatedAt ? (
        <p className="mt-3 text-xs text-slate-500">Diperbarui {formatDate(updatedAt)}</p>
      ) : null}
    </div>
  );
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  const schoolName = data.school?.name ?? "EduCore";
  const tagline =
    data.school?.tagline ?? "Kelola konten situs sekolah dan pantau status publikasi.";
  const publishedSections = data.homeSections.filter((section) => section.isPublished).length;
  const totalSections = data.homeSections.length;
  const draftNews = getCountByStatus(data.newsStatusGroups, "draft");
  const totalNews = data.newsStatusGroups.reduce((sum, item) => sum + item._count._all, 0);
  const adminTeamCount =
    getCountByGroupValue(data.usersByRole, "role", "super_admin")
    + getCountByGroupValue(data.usersByRole, "role", "cms_admin");
  const schoolCompleteness = getCompleteness(data.school, [
    "name",
    "tagline",
    "street",
    "city",
    "phone",
    "email",
    "logoUrl",
    "siteTitle",
  ]);
  const aboutCompleteness = getCompleteness(data.aboutPage, [
    "pageTitle",
    "pageSubtitle",
    "profileTitle",
    "profileParagraphs",
    "visionContent",
    "missionItems",
    "valuesItems",
  ]);

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
              CMS Dashboard
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
              Ringkasan {schoolName}
            </h1>
            <p
              className="mt-3 max-w-2xl text-sm leading-6 md:text-base"
              style={{
                color: "color-mix(in srgb, var(--admin-primary-foreground) 84%, transparent)",
              }}
            >
              {tagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: "color-mix(in srgb, white 22%, transparent)",
                  backgroundColor: "color-mix(in srgb, white 10%, transparent)",
                }}
              >
                {publishedSections}/{totalSections} section beranda tayang
              </span>
              <span
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: "color-mix(in srgb, white 22%, transparent)",
                  backgroundColor: "color-mix(in srgb, white 10%, transparent)",
                }}
              >
                {formatNumber(data.publishedNews)} berita terbit
              </span>
              <span
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: "color-mix(in srgb, white 22%, transparent)",
                  backgroundColor: "color-mix(in srgb, white 10%, transparent)",
                }}
              >
                Profil sekolah {schoolCompleteness}% lengkap
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
              Perlu perhatian
            </p>
            <p className="mt-2 text-xl font-semibold">
              {draftNews > 0
                ? `${formatNumber(draftNews)} berita draft`
                : aboutCompleteness < 70
                  ? "Lengkapi halaman tentang"
                  : "Semua konten utama siap"}
            </p>
            <p
              className="mt-2 text-sm"
              style={{
                color: "color-mix(in srgb, var(--admin-primary-foreground) 78%, transparent)",
              }}
            >
              {draftNews > 0
                ? "Publikasikan berita agar tampil di situs."
                : `Halaman tentang ${aboutCompleteness}% · ${formatNumber(data.homeSectionItemsCount)} item beranda.`}
            </p>
          </div>
        </div>
      </section>

    

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Section beranda</h2>
            <p className="mt-1 text-sm text-slate-600">
              Konten utama halaman depan situs sekolah.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {data.homeSections.length > 0 ? (
              data.homeSections.map((section) => (
                <div
                  key={section.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {homeSectionLabels[section.type] ?? section.type}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          section.isPublished ? toneClasses.emerald : toneClasses.slate
                        }`}
                      >
                        {section.isPublished ? "Tayang" : "Disembunyikan"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Diperbarui {formatDate(section.updatedAt)}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500">Item konten</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {formatNumber(section._count.items)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Belum ada section beranda di database.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Halaman publik</h2>
            <p className="mt-1 text-sm text-slate-600">Status konten CMS.</p>
            <div className="mt-6 grid gap-3">
              <ContentStatusCard
                title="Profil sekolah"
                status={{
                  label: schoolCompleteness >= 80 ? "Lengkap" : "Perlu dilengkapi",
                  tone: schoolCompleteness >= 80 ? "emerald" : "slate",
                }}
                description={
                  data.school?.siteTitle
                    ? `Judul situs: ${data.school.siteTitle}`
                    : "Nama, kontak, dan identitas belum lengkap."
                }
                updatedAt={data.school?.updatedAt}
              />
              <ContentStatusCard
                title="Halaman tentang"
                status={{
                  label: data.aboutPage ? (aboutCompleteness >= 70 ? "Siap" : "Draft") : "Kosong",
                  tone: data.aboutPage && aboutCompleteness >= 70 ? "emerald" : "slate",
                }}
                description={
                  data.aboutPage?.pageTitle
                    ? data.aboutPage.pageTitle
                    : "Belum ada konten halaman tentang."
                }
                updatedAt={data.aboutPage?.updatedAt}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Aksi cepat</h2>
            <div className="mt-4 grid gap-3">
              <ActionLink
                href="/admin/beranda"
                title="Kelola beranda"
                description="Section hero, prestasi, ekstrakurikuler, dan lainnya."
              />
              <ActionLink
                href="/admin/pengaturan"
                title="Pengaturan sekolah"
                description="Nama, kontak, jam operasional, dan identitas."
              />
              <ActionLink
                href="/admin/tema"
                title="Tema situs"
                description="Warna primary, secondary, dan accent."
              />
              <ActionLink
                href="/admin/berita"
                title="Kelola berita"
                description="Draft, publikasi, dan artikel unggulan."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Berita terbaru</h2>
            <p className="mt-1 text-sm text-slate-600">
              {formatNumber(data.publishedNews)} terbit · {formatNumber(draftNews)} draft
            </p>
          </div>
          <Link
            href="/admin/berita"
            className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Lihat semua
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.latestNews.length > 0 ? (
            data.latestNews.map((post) => (
              <div key={post.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                      post.status === "published" ? toneClasses.emerald : toneClasses.slate
                    }`}
                  >
                    {post.status === "published" ? "Terbit" : "Draft"}
                  </span>
                  <span className="text-xs text-slate-500">{post.category}</span>
                </div>
                <p className="mt-3 font-semibold text-slate-900">{post.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {post.publishedAt
                    ? `Terbit ${formatDate(post.publishedAt)}`
                    : `Diubah ${formatDate(post.updatedAt)}`}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Belum ada berita di database.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
