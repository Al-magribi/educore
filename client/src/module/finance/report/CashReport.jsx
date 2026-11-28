import { Tag } from "antd";

import FinanceFeaturePage from "./FinanceFeaturePage";

const columns = [
  {
    title: "Kelas",
    dataIndex: "classroom",
    key: "classroom",
  },
  {
    title: "Saldo Awal",
    dataIndex: "opening",
    key: "opening",
  },
  {
    title: "Saldo Akhir",
    dataIndex: "closing",
    key: "closing",
  },
  {
    title: "Kondisi",
    dataIndex: "status",
    key: "status",
    render: (status) => <Tag color={status.color}>{status.label}</Tag>,
  },
];

const dataSource = [
  {
    key: 1,
    classroom: "X IPA 1",
    opening: "Rp2.350.000",
    closing: "Rp3.125.000",
    status: { label: "Sehat", color: "green" },
  },
  {
    key: 2,
    classroom: "XI IPS 2",
    opening: "Rp1.840.000",
    closing: "Rp1.165.000",
    status: { label: "Perlu Pantau", color: "gold" },
  },
  {
    key: 3,
    classroom: "XII IPA 3",
    opening: "Rp2.100.000",
    closing: "Rp620.000",
    status: { label: "Rendah", color: "red" },
  },
];

const CashReport = () => (
  <FinanceFeaturePage
    badge='Laporan Kas Kelas'
    title='Pantau saldo dan aktivitas kas kelas'
    description='Laporan kas kelas membantu memonitor pemasukan, pengeluaran, dan saldo akhir tiap kelas agar dana terkelola secara tertib.'
    highlight='Dua kelas memiliki saldo akhir di bawah batas aman dan perlu verifikasi pengeluaran sebelum akhir pekan.'
    summary={{
      title: "24 kelas terpantau",
      description: "Saldo kas kelas aktif yang sedang dimonitor admin keuangan.",
      percent: 68,
    }}
    stats={[
      { title: "Total Saldo", value: 48275000, prefix: "Rp", note: "Akumulasi seluruh kelas" },
      { title: "Setoran Mingguan", value: 13450000, prefix: "Rp", note: "Pemasukan pekan berjalan" },
      { title: "Pengeluaran Mingguan", value: 6250000, prefix: "Rp", note: "Belanja kelas dan kegiatan" },
      { title: "Kelas Risiko", value: 2, note: "Saldo turun di bawah ambang kontrol" },
    ]}
    actions={[
      { label: "Buka transaksi keuangan", to: "/finance/transaksi", type: "primary" },
      { label: "Lihat laporan tabungan", to: "/finance/laporan-tabungan" },
      { label: "Lihat pembayaran lainnya", to: "/finance/pembayaran-lainnya" },
    ]}
    notes={[
      {
        title: "Validasi pengeluaran non-rutin",
        description: "Pengeluaran kegiatan kelas sebaiknya selalu disertai bukti dan persetujuan.",
      },
      {
        title: "Cek saldo minimum",
        description: "Tentukan batas aman saldo kas agar kelas tidak minus saat ada kebutuhan mendadak.",
        type: "document",
      },
      {
        title: "Sinkronkan wali kelas",
        description: "Laporan mingguan perlu dibagikan ke wali kelas untuk review bersama.",
      },
    ]}
    columns={columns}
    dataSource={dataSource}
  />
);

export default CashReport;
