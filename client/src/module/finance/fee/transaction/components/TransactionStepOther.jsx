import { Card, Empty, Flex, InputNumber, Skeleton, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

import {
  currencyFormatter,
  getChargeStatusColor,
  getOtherPaymentSelectionKey,
} from "./transactionFormShared.jsx";

const { Text } = Typography;
const MotionDiv = motion.div;

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
      {otherCharges.map((charge, index) => {
        const selectionKey = getOtherPaymentSelectionKey(charge);
        const selection = selections?.[selectionKey];
        const amountDue = Number(charge.amount_due || 0);
        const selectedAmount = Number(selection?.amount_paid || 0);
        const paidAmount = Math.max(Number(charge.paid_amount || 0), 0);
        const displayPaidAmount = Math.min(amountDue, paidAmount + selectedAmount);
        const displayRemainingAmount = Math.max(amountDue - displayPaidAmount, 0);
        const editableMaxAmount = Math.max(
          Number(charge.remaining_amount || 0),
          selectedAmount,
        );
        const status =
          displayRemainingAmount <= 0
            ? "paid"
            : displayPaidAmount > 0
              ? "partial"
              : charge.status;

        return (
          <MotionDiv
            key={selectionKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "#fff",
              }}
              styles={{ body: { padding: 18 } }}
            >
              <Flex vertical gap={14}>
                <Flex justify='space-between' align='start' gap={12}>
                  <Space align='start' size={10}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 14,
                        background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                        color: "#2563eb",
                        flexShrink: 0,
                      }}
                    >
                      <ReceiptText size={18} />
                    </div>
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
                  </Space>
                  <Tag
                    color={getChargeStatusColor(status)}
                    style={{ borderRadius: 999, fontWeight: 600 }}
                  >
                    {status === "partial"
                      ? "Cicilan"
                      : status === "paid"
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
                    <Text strong>{currencyFormatter.format(amountDue)}</Text>
                  </Space>
                  <Space direction='vertical' size={1}>
                    <Text type='secondary'>Terbayar</Text>
                    <Text strong>{currencyFormatter.format(displayPaidAmount)}</Text>
                  </Space>
                  <Space direction='vertical' size={1}>
                    <Text type='secondary'>Sisa</Text>
                    <Text strong>
                      {currencyFormatter.format(displayRemainingAmount)}
                    </Text>
                  </Space>
                </div>

                <InputNumber
                  size='large'
                  min={0}
                  max={editableMaxAmount}
                  value={selection?.amount_paid}
                  placeholder='Input nominal bayar'
                  style={{ width: "100%" }}
                  formatter={(value) =>
                    value
                      ? `Rp ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
                      : ""
                  }
                  parser={(value) =>
                    Number(String(value || "").replace(/[^\d]/g, "")) || 0
                  }
                  onChange={(value) => onOtherPaymentAmountChange(charge, value)}
                />
              </Flex>
            </Card>
          </MotionDiv>
        );
      })}
    </div>
  );
};

export default TransactionStepOther;
