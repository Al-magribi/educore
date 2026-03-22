import { Tag } from "antd";

import FinanceFeaturePage from "../components/FinanceFeaturePage";

const columns = [
  {
    title: "Siswa",
    dataIndex: "student",
    key: "student",
  },
  {
    title: "Setoran Bulan Ini",
    dataIndex: "deposit",
    key: "deposit",
  },
  {
    title: "Saldo",
    dataIndex: "balance",
    key: "balance",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status) => <Tag color={status.color}>{status.label}</Tag>,
  },
];

const dataSource = [
  {
    key: 1,
    student: "Naila Putri",
    deposit: "Rp400.000",
    balance: "Rp2.350.000",
    status: { label: "Aktif", color: "green" },
  },
  {
    key: 2,
    student: "Ahmad Rafi",
    deposit: "Rp250.000",
    balance: "Rp1.780.000",
    status: { label: "Aktif", color: "blue" },
  },
  {
    key: 3,
    student: "Salma Khasanah",
    deposit: "Rp0",
    balance: "Rp925.000",
    status: { label: "Pasif", color: "gold" },
  },
];

const SavingReport = () => (
  <FinanceFeaturePage
    badge='Laporan Tabungan'
    title='Rekap tabungan siswa dan mutasi setoran'
    description='Halaman ini digunakan untuk melihat perkembangan saldo tabungan siswa, intensitas setoran, dan akun yang perlu diingatkan.'
    highlight='Sebagian besar setoran datang dari kelas XI, sementara akun pasif meningkat pada siswa kelas akhir.'
    summary={{
      title: "1.286 akun tabungan",
      description: "Total siswa dengan rekening tabungan aktif di sekolah.",
      percent: 74,
    }}
    stats={[
      { title: "Saldo Tabungan", value: 126320000, prefix: "Rp", note: "Akumulasi dana titipan siswa" },
      { title: "Setoran Minggu Ini", value: 28950000, prefix: "Rp", note: "Transaksi setoran tervalidasi" },
      { title: "Akun Aktif", value: 1108, note: "Setor minimal sekali bulan ini" },
      { title: "Akun Pasif", value: 178, note: "Belum ada setoran terbaru" },
    ]}
    actions={[
      { label: "Buka transaksi keuangan", to: "/finance/transaksi", type: "primary" },
      { label: "Lihat laporan kas kelas", to: "/finance/laporan-kas-kelas" },
      { label: "Lihat pembayaran SPP", to: "/finance/pembayaran-spp" },
    ]}
    notes={[
      {
        title: "Pisahkan tabungan dari pendapatan",
        description: "Saldo tabungan harus diperlakukan sebagai dana titipan, bukan pemasukan sekolah.",
        type: "document",
      },
      {
        title: "Sorot akun pasif",
        description: "Akun tanpa setoran baru bisa dijadikan target pengingat berkala.",
      },
      {
        title: "Cek mutasi harian",
        description: "Setoran dan penarikan perlu direkonsiliasi setiap hari kerja.",
      },
    ]}
    columns={columns}
    dataSource={dataSource}
  />
);

export default SavingReport;
