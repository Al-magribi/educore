import dayjs from "dayjs";
import { Card, Flex, Grid, Table, Typography } from "antd";

import { currencyFormatter } from "../constants";

const { Text } = Typography;

const OthersInstallmentHistory = ({ charge }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const installments = charge.installments || [];

  const desktopColumns = [
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

  const mobileColumns = [
    {
      title: "Pembayaran",
      key: "payment",
      render: (_, record) => (
        <Flex vertical gap={4} style={{ width: "100%" }}>
          <Flex justify='space-between' align='center' gap={8}>
            <Text strong>#{record.installment_number}</Text>
            <Text strong>
              {currencyFormatter.format(Number(record.amount_paid || 0))}
            </Text>
          </Flex>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.payment_date
              ? dayjs(record.payment_date).format("DD MMM YYYY")
              : "-"}
            {" · "}
            {record.payment_method || "-"}
          </Text>
          {record.notes ? (
            <Text type='secondary' style={{ fontSize: 12, wordBreak: "break-word" }}>
              {record.notes}
            </Text>
          ) : null}
        </Flex>
      ),
    },
  ];

  return (
    <Card
      size='small'
      title='Riwayat Pembayaran'
      style={{ borderRadius: 18 }}
      styles={{ body: { padding: isMobile ? 8 : 12 } }}
    >
      <Table
        rowKey='installment_id'
        columns={isMobile ? mobileColumns : desktopColumns}
        dataSource={installments}
        pagination={false}
        size={isMobile ? "small" : "middle"}
        scroll={isMobile ? undefined : { x: 720 }}
        locale={{ emptyText: "Belum ada pembayaran untuk tagihan ini." }}
      />
    </Card>
  );
};

export default OthersInstallmentHistory;
