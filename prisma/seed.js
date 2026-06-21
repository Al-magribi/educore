/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.schoolSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "SMA EduCore Nusantara",
      tagline: "Membangun Generasi Unggul Berakhlak Mulia",
      siteTitle: "SMA EduCore Nusantara",
      officeHours: [],
    },
  });

  await prisma.themeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      primary: "#2563eb",
      isCustom: false,
    },
  });

  await prisma.paymentSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      registrationFee: 350000,
      manualEnabled: true,
      midtransEnabled: false,
      manualInstructions:
        "Transfer ke rekening sekolah BCA 1234567890 a.n. SMA EduCore Nusantara. Upload bukti di portal.",
      bankName: "BCA",
      bankAccountNumber: "1234567890",
      bankAccountName: "SMA EduCore Nusantara",
    },
  });

  await prisma.smtpSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      enabled: false,
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      fromName: "SPMB EduCore",
      fromEmail: "spmb@educorenusantara.sch.id",
    },
  });

  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@educore.local" },
    update: {},
    create: {
      email: "admin@educore.local",
      passwordHash: adminPassword,
      name: "Super Admin",
      role: "super_admin",
      emailVerifiedAt: new Date(),
    },
  });

  const spmbAdminPassword = await bcrypt.hash("Spmb123!", 12);
  await prisma.user.upsert({
    where: { email: "spmb@educore.local" },
    update: {},
    create: {
      email: "spmb@educore.local",
      passwordHash: spmbAdminPassword,
      name: "Admin SPMB",
      role: "spmb_admin",
      emailVerifiedAt: new Date(),
    },
  });

  const feeItemDefinitions = [
    { id: "ipsp", label: "Iuran Pengembangan Sarana Pendidikan (IPSP)", frequency: "once" },
    { id: "spp", label: "Sumbangan Pengelolaan Pendidikan (SPP)", frequency: "monthly" },
    { id: "ipks", label: "Iuran Pengembangan Keterampilan Siswa (IPKS)", frequency: "yearly" },
    { id: "ikk", label: "Iuran Kegiatan Kesiswaan (IKK/OSIS)", frequency: "yearly" },
    { id: "mpls", label: "Iuran Kegiatan Awal Peserta Didik Baru Masa Pengenalan Sekolah (MPLS)", frequency: "once" },
    {
      id: "admin_supplies",
      label: "Pengadaan Perlengkapan Administrasi Kesiswaan (Pas Foto, Kartu Pelajar, Sampul, dan Laporan Pendidikan)",
      frequency: "once",
    },
    {
      id: "personal",
      label: "Biaya Pribadi Peserta Didik (Pakaian Seragam Sekolah, Jas Almamater, Rompi, dan Atribut)",
      frequency: "once",
    },
  ];

  const gelombang1Amounts = {
    ipsp: 5_000_000,
    spp: 590_000,
    ipks: 580_000,
    ikk: 400_000,
    mpls: 550_000,
    admin_supplies: 525_000,
    personal: 900_000,
  };

  const gelombang2Amounts = {
    ...gelombang1Amounts,
    ipsp: 6_500_000,
  };

  for (const [index, item] of feeItemDefinitions.entries()) {
    await prisma.financialFeeItem.upsert({
      where: { id: item.id },
      update: {
        label: item.label,
        frequency: item.frequency,
        applyToAll: true,
        sortOrder: index,
      },
      create: {
        id: item.id,
        label: item.label,
        frequency: item.frequency,
        applyToAll: true,
        sortOrder: index,
      },
    });
  }

  const period = await prisma.admissionPeriod.upsert({
    where: { id: "period-2026-2027-g1" },
    update: {
      opensAt: new Date("2025-12-01"),
      closesAt: new Date("2026-02-28"),
    },
    create: {
      id: "period-2026-2027-g1",
      academicYear: "2026/2027",
      name: "Gelombang 1",
      opensAt: new Date("2025-12-01"),
      closesAt: new Date("2026-02-28"),
      isActive: true,
    },
  });

  const period2 = await prisma.admissionPeriod.upsert({
    where: { id: "period-2026-2027-g2" },
    update: {},
    create: {
      id: "period-2026-2027-g2",
      academicYear: "2026/2027",
      name: "Gelombang 2",
      opensAt: new Date("2026-03-01"),
      closesAt: new Date("2026-05-31"),
      isActive: false,
    },
  });

  for (const item of feeItemDefinitions) {
    for (const [periodRow, amounts] of [
      [period, gelombang1Amounts],
      [period2, gelombang2Amounts],
    ]) {
      await prisma.financialFeeItemPeriod.upsert({
        where: {
          itemId_periodId: { itemId: item.id, periodId: periodRow.id },
        },
        update: { amount: amounts[item.id] ?? 0 },
        create: {
          itemId: item.id,
          periodId: periodRow.id,
          amount: amounts[item.id] ?? 0,
        },
      });
    }
  }

  await prisma.formDefinition.upsert({
    where: { id: "form-default-2026" },
    update: {},
    create: {
      id: "form-default-2026",
      periodId: period.id,
      name: "Formulir SPMB 2026/2027",
      version: 1,
      isActive: true,
      schema: {
        fields: [
          { id: "full_name", type: "text", label: "Nama Lengkap", required: true },
          { id: "birth_place", type: "text", label: "Tempat Lahir", required: true },
          { id: "birth_date", type: "date", label: "Tanggal Lahir", required: true },
          { id: "prev_school", type: "text", label: "Asal Sekolah", required: true },
          {
            id: "photo",
            type: "file",
            label: "Pas Foto 3x4",
            required: true,
            accept: "image/jpeg,image/png",
          },
        ],
      },
    },
  });

  const sampleNews = [
    {
      slug: "pembukaan-spmb-2026-2027",
      title: "Pembukaan SPMB Tahun Ajaran 2026/2027 Resmi Dibuka",
      excerpt:
        "Pendaftaran siswa baru dibuka mulai 1 Juni 2026. Simak persyaratan, jadwal, dan tata cara pendaftaran online.",
      category: "SPMB",
      featured: true,
      readMinutes: 4,
      publishedAt: new Date("2026-05-20T08:00:00.000Z"),
      body: [
        "SMA EduCore Nusantara dengan bangga mengumumkan pembukaan Seleksi Penerimaan Murid Baru (SPMB) untuk tahun ajaran 2026/2027. Pendaftaran dilakukan secara online melalui portal resmi sekolah.",
        "Calon siswa wajib membuat akun, melakukan verifikasi email, dan menyelesaikan pembayaran formulir sebelum mengisi data lengkap dan mengunggah berkas persyaratan.",
        "Jadwal penting: pendaftaran dibuka 1 Juni–30 Juni 2026, seleksi administrasi 1–10 Juli, pengumuman hasil 20 Juli 2026. Informasi lengkap tersedia di halaman SPMB.",
      ],
    },
    {
      slug: "juara-olimpiade-sains-provinsi",
      title: "Tim Olimpiade Sains Raih 3 Medali Emas Tingkat Provinsi",
      excerpt:
        "Siswa EduCore membanggakan di OSN provinsi bidang Matematika, Fisika, dan Biologi.",
      category: "Prestasi",
      featured: false,
      readMinutes: 3,
      publishedAt: new Date("2026-05-15T10:30:00.000Z"),
      body: [
        "Tim olimpiade sains SMA EduCore Nusantara kembali menorehkan prestasi dengan meraih tiga medali emas pada Olimpiade Sains tingkat provinsi.",
        "Medali diraih oleh siswa kelas XI dan XII setelah mengikuti pelatihan intensif selama tiga bulan bersama pembina dari berbagai jurusan.",
      ],
    },
    {
      slug: "workshop-literasi-digital-guru-siswa",
      title: "Workshop Literasi Digital untuk Guru dan Siswa",
      excerpt:
        "Kolaborasi dengan mitra teknologi pendidikan meningkatkan kompetensi digital di kelas.",
      category: "Kegiatan",
      featured: false,
      readMinutes: 5,
      publishedAt: new Date("2026-05-10T14:00:00.000Z"),
      body: [
        "Sekolah menyelenggarakan workshop literasi digital selama dua hari yang diikuti oleh 40 guru dan perwakilan siswa dari setiap kelas.",
        "Materi mencakup penggunaan platform pembelajaran, keamanan siber, etika media sosial, serta pemanfaatan AI secara bertanggung jawab dalam proses belajar.",
      ],
    },
  ];

  for (const item of sampleNews) {
    await prisma.newsPost.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        ...item,
        status: "published",
        authorId: adminUser.id,
      },
    });
  }

  await prisma.aboutPage.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      pageTitle: "Tentang Kami",
      pageSubtitle:
        "Mengenal lebih dekat visi, misi, dan komitmen SMA EduCore Nusantara dalam membentuk generasi unggul.",
      pageImageUrl:
        "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80",
      pageImageAlt: "Gedung dan lingkungan SMA EduCore Nusantara",
      profileTitle: "Profil Sekolah",
      profileParagraphs: [
        "SMA EduCore Nusantara didirikan dengan semangat menghadirkan pendidikan bermutu yang mengintegrasikan akademik, karakter, dan literasi digital. Sejak berdiri, kami konsisten meraih prestasi di tingkat regional hingga nasional.",
        "Dengan tenaga pendidik profesional dan fasilitas yang terus dikembangkan, kami menciptakan lingkungan belajar yang aman, inklusif, dan inspiratif bagi setiap siswa.",
      ],
      profileHighlights: [
        { label: "Tahun Berdiri", value: "1998" },
        { label: "Akreditasi", value: "A" },
        { label: "Siswa Aktif", value: "1.200+" },
      ],
      visionTitle: "Visi",
      visionContent:
        "Menjadi sekolah menengah unggul yang menghasilkan lulusan berintegritas, berprestasi akademik dan non-akademik, serta siap berkontribusi di era global.",
      missionTitle: "Misi",
      missionItems: [
        "Menyelenggarakan pembelajaran aktif berbasis kurikulum nasional yang diperkaya pendekatan STEM dan karakter.",
        "Mengembangkan potensi siswa melalui pembinaan akademik, spiritual, dan kegiatan ekstrakurikuler terarah.",
        "Membangun kerja sama dengan orang tua, alumni, dan mitra pendidikan untuk mutu layanan berkelanjutan.",
        "Menerapkan tata kelola sekolah transparan, akuntabel, dan berorientasi pada peningkatan mutu.",
      ],
      valuesTitle: "Nilai-Nilai Utama",
      valuesItems: [
        {
          id: "1",
          title: "Integritas",
          description: "Jujur, disiplin, dan bertanggung jawab dalam setiap tindakan.",
        },
        {
          id: "2",
          title: "Excellence",
          description: "Berusaha terbaik secara konsisten dalam akademik maupun perilaku.",
        },
        {
          id: "3",
          title: "Kolaborasi",
          description: "Belajar dan berprestasi bersama dalam semangat kebersamaan.",
        },
        {
          id: "4",
          title: "Inovasi",
          description: "Terbuka pada perubahan dan pemanfaatan teknologi secara bijak.",
        },
      ],
    },
  });

  console.log("Seed selesai.");
  console.log("  Admin: admin@educore.local / Admin123!");
  console.log("  SPMB:  spmb@educore.local / Spmb123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
