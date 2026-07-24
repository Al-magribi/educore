import dayjs from "dayjs";
import { Card, Table } from "antd";

import { currencyFormatter } from "../constants";

const OthersInstallmentHistory = ({ charge }) => {
  const columns = [
    {
      title: "Termin",
      dataIndex: "installment_number",
      key: "installment_number",
      width: 90,
      render: (value) => `#${value}`,
    },
    {
      title: "Tanggal",
      dataIndex: "payment_date",
      key: "payment_date",
      render: (value) => (value ? dayjs(value).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Nominal",
      dataIndex: "amount_paid",
      key: "amount_paid",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Metode",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (value) => value || "-",
    },
    {
      title: "Catatan",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (value) => value || "-",
    },
  ];

  return (
    <Card size='small' title='Riwayat Pembayaran' style={{ borderRadius: 18 }}>
      <Table
        rowKey='installment_id'
        columns={columns}
        dataSource={charge.installments || []}
        pagination={false}
        scroll={{ x: 720 }}
        locale={{ emptyText: "Belum ada pembayaran untuk tagihan ini." }}
      />
    </Card>
  );
};

export default OthersInstallmentHistory;
