import {
  Card,
  Checkbox,
  Empty,
  Flex,
  Form,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";

import { currencyFormatter } from "./transactionFormShared.jsx";

const { Text } = Typography;
const MotionDiv = motion.div;

const TransactionStepSpp = ({
  form,
  unpaidMonths,
  tariffAmount,
  loading,
  editingTransaction,
}) => {
  const selectedMonths = Form.useWatch("bill_months", form) || [];
  const normalizedSelectedMonths = selectedMonths.map((month) => Number(month));
  const displayedMonths =
    unpaidMonths.length > 0
      ? unpaidMonths
      : normalizedSelectedMonths.map((month) => ({
          value: month,
          label: editingTransaction?.bill_months?.includes(month)
            ? `Bulan ${month}`
            : `Bulan ${month}`,
        }));

  if (loading) {
    return (
      <Card style={{ borderRadius: 18 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (displayedMonths.length === 0) {
    return (
      <Card style={{ borderRadius: 18 }}>
        <Empty description='Tidak ada tagihan SPP yang belum dibayar' />
      </Card>
    );
  }

  return (
    <Flex vertical gap={18}>
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
        }}
      >
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Space align='center' size={10}>
            <div
              style={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                borderRadius: 15,
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
              }}
            >
              <CreditCard size={18} />
            </div>
            <Space direction='vertical' size={2}>
              <Text strong style={{ color: "#0f172a", fontSize: 16 }}>
                Pembayaran SPP
              </Text>
              <Text type='secondary'>
                Pilih lebih dari satu bulan bila siswa membayar sekaligus.
              </Text>
            </Space>
          </Space>
          <Tag color='blue' style={{ borderRadius: 999, paddingInline: 12 }}>
            Tarif {currencyFormatter.format(tariffAmount)}
          </Tag>
        </Flex>
      </Card>

      <Form.Item name='bill_months' noStyle>
        <Checkbox.Group style={{ width: "100%" }}>
          <Flex wrap gap='small'>
            {displayedMonths.map((month, index) => {
              const active = normalizedSelectedMonths.includes(Number(month.value));

              return (
                <MotionDiv
                  key={month.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    hoverable
                    style={{
                      borderRadius: 18,
                      border: active
                        ? "1px solid rgba(37, 99, 235, 0.42)"
                        : "1px solid rgba(148, 163, 184, 0.18)",
                      background: active
                        ? "linear-gradient(135deg, rgba(219, 234, 254, 0.94), rgba(239, 246, 255, 0.96))"
                        : "#ffffff",
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Checkbox value={month.value} style={{ width: "100%" }}>
                      <Space direction='vertical' size={2}>
                        <Text strong>{month.label}</Text>
                        <Text type='secondary'>
                          {currencyFormatter.format(tariffAmount)}
                        </Text>
                      </Space>
                    </Checkbox>
                  </Card>
                </MotionDiv>
              );
            })}
          </Flex>
        </Checkbox.Group>
      </Form.Item>
    </Flex>
  );
};

export default TransactionStepSpp;
