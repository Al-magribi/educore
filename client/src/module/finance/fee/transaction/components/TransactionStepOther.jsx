import { Card, Empty, Flex, InputNumber, Skeleton, Space, Tag, Typography } from "antd";

import {
  currencyFormatter,
  getChargeStatusColor,
  getOtherPaymentSelectionKey,
} from "./transactionFormShared.jsx";

const { Text } = Typography;

const TransactionStepOther = ({
  otherCharges,
  otherPaymentSelections,
  onOtherPaymentAmountChange,
  loading,
}) => {
  const selections = otherPaymentSelections || {};

  if (loading) {
    return (
      <Card style={{ borderRadius: 18 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (otherCharges.length === 0) {
    return (
      <Card style={{ borderRadius: 18 }}>
        <Empty description='Belum ada pembayaran lainnya untuk siswa ini' />
      </Card>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
      }}
    >
      {otherCharges.map((charge) => {
        const selectionKey = getOtherPaymentSelectionKey(charge);
        const selection = selections?.[selectionKey];

        return (
          <Card
            key={selectionKey}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148, 163, 184, 0.18)",
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Flex vertical gap={14}>
              <Flex justify='space-between' align='start' gap={12}>
                <Space direction='vertical' size={2}>
                  <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
                    {charge.type_name}
                  </Text>
                  <Text type='secondary'>
                    {charge.is_existing_charge
                      ? charge.description || "Tagihan sudah dibuat"
                      : "Tarif aktif sesuai tingkat siswa"}
                  </Text>
                </Space>
                <Tag color={getChargeStatusColor(charge.status)}>
                  {charge.status === "partial"
                    ? "Cicilan"
                    : charge.status === "paid"
                      ? "Lunas"
                      : "Belum Bayar"}
                </Tag>
              </Flex>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <Space direction='vertical' size={1}>
                  <Text type='secondary'>Tagihan</Text>
                  <Text strong>{currencyFormatter.format(charge.amount_due)}</Text>
                </Space>
                <Space direction='vertical' size={1}>
                  <Text type='secondary'>Terbayar</Text>
                  <Text strong>{currencyFormatter.format(charge.paid_amount)}</Text>
                </Space>
                <Space direction='vertical' size={1}>
                  <Text type='secondary'>Sisa</Text>
                  <Text strong>
                    {currencyFormatter.format(charge.remaining_amount)}
                  </Text>
                </Space>
              </div>

              <InputNumber
                size='large'
                min={0}
                max={charge.remaining_amount}
                value={selection?.amount_paid}
                placeholder='Input nominal bayar'
                style={{ width: "100%" }}
                formatter={(value) =>
                  value ? `Rp ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""
                }
                parser={(value) =>
                  Number(String(value || "").replace(/[^\d]/g, "")) || 0
                }
                onChange={(value) => onOtherPaymentAmountChange(charge, value)}
              />
            </Flex>
          </Card>
        );
      })}
    </div>
  );
};

export default TransactionStepOther;
