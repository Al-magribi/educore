export const spmbLandingDefaults = {
  page: {
    title: "Penerimaan Siswa Baru (SPMB)",
    subtitle:
      "Tahun ajaran 2026/2027 — daftar online, lengkapi pembayaran dan berkas, pantau status pendaftaran Anda kapan saja.",
    academicYear: "2026/2027",
    status: "open",
    statusLabel: "Pendaftaran Dibuka",
    imageUrl: "",
    imageAlt: "Calon siswa baru",
    sections: {
      schedule: {
        eyebrow: "Jadwal",
        title: "Timeline Penerimaan",
        description: "Catat tanggal penting agar tidak terlewat dalam proses pendaftaran.",
      },
      flow: {
        eyebrow: "Alur Pendaftaran",
        title: "Langkah demi Langkah",
        description: "Ikuti urutan berikut setelah membuat akun calon siswa.",
      },
      requirements: {
        eyebrow: "Persyaratan",
        title: "Dokumen yang Diperlukan",
        description: "Siapkan berkas berikut sebelum mengunggah ke portal.",
      },
      faq: {
        eyebrow: "FAQ",
        title: "Pertanyaan yang Sering Diajukan",
        description: "Jawaban singkat untuk hal yang paling sering ditanyakan calon siswa.",
      },
    },
  },
  schedule: [
    {
      id: "1",
      date: "1 Juni 2026",
      title: "Pembukaan Pendaftaran",
      description: "Portal SPMB dibuka untuk pendaftaran online.",
    },
    {
      id: "2",
      date: "30 Juni 2026",
      title: "Penutupan Pendaftaran",
      description: "Batas akhir registrasi dan pembayaran formulir.",
    },
    {
      id: "3",
      date: "1–10 Juli 2026",
      title: "Seleksi Administrasi",
      description: "Verifikasi berkas dan kelengkapan data calon siswa.",
    },
    {
      id: "4",
      date: "20 Juli 2026",
      title: "Pengumuman Hasil",
      description: "Pengumuman diterima / ditolak melalui dashboard akun.",
    },
  ],
  flow: [
    {
      step: 1,
      title: "Buat Akun & Verifikasi Email",
      description:
        "Daftar dengan email aktif, lalu konfirmasi melalui tautan yang dikirim ke inbox Anda.",
    },
    {
      step: 2,
      title: "Login & Pembayaran Formulir",
      description:
        "Masuk ke portal, lakukan pembayaran biaya pendaftaran (transfer manual atau Midtrans).",
    },
    {
      step: 3,
      title: "Isi Formulir & Upload Berkas",
      description:
        "Lengkapi data diri sesuai form dari sekolah dan unggah dokumen yang dipersyaratkan.",
    },
    {
      step: 4,
      title: "Kuesioner (jika ada)",
      description:
        "Jawab kuesioner kepribadian dan gaya belajar jika diaktifkan oleh admin.",
    },
    {
      step: 5,
      title: "Pantau Status Pendaftaran",
      description:
        "Cek dashboard untuk status: menunggu verifikasi, diterima, atau ditolak.",
    },
  ],
  requirements: [
    "Fotokopi akta kelahiran (1 lembar)",
    "Fotokopi kartu keluarga (1 lembar)",
    "Fotokopi rapor semester 1–5 SMP/MTs (masing-masing 1 lembar)",
    "Pas foto berwarna 3×4 (4 lembar, latar merah)",
    "Surat keterangan lulus / ijazah sementara (jika sudah ada)",
  ],
  fees: {
    note: "Biaya pendaftaran tidak dapat dikembalikan setelah formulir disubmit.",
    paymentMethods: ["Transfer manual ke rekening sekolah", "Pembayaran online via Midtrans"],
  },
  faq: [
    {
      id: "1",
      question: "Apakah bisa mendaftar jika rapor belum lengkap?",
      answer:
        "Boleh mendaftar terlebih dahulu. Berkas rapor yang belum ada dapat dilengkapi sebelum batas akhir upload.",
    },
    {
      id: "2",
      question: "Bagaimana jika pembayaran sudah dilakukan tapi status belum berubah?",
      answer:
        "Untuk pembayaran manual, verifikasi membutuhkan 1×24 jam kerja. Pembayaran Midtrans biasanya terkonfirmasi otomatis.",
    },
    {
      id: "3",
      question: "Bisakah mengubah data setelah submit?",
      answer:
        "Data dapat diubah selama status masih draft atau menunggu verifikasi. Hubungi admin jika pendaftaran sudah disubmit.",
    },
  ],
  contact: {
    title: "Butuh Bantuan?",
    description:
      "Tim SPMB siap membantu Senin–Jumat, 08.00–15.00 WIB melalui kontak di bawah.",
    email: "spmb@educorenusantara.sch.id",
    phone: "+62 22 1234 5678",
    whatsapp: "+62 812 3456 7890",
  },
};
