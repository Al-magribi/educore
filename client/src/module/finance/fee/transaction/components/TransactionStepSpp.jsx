import {
  Card,
  Checkbox,
  Empty,
  Flex,
  Form,
  Grid,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";

import { currencyFormatter } from "./transactionFormShared.jsx";
import ScholarshipAmountCell from "../../ScholarshipAmountCell";

const { Text } = Typography;
const MotionDiv = motion.div;

const TransactionStepSpp = ({
  form,
  unpaidMonths,
  tariffAmount,
  loading,
  editingTransaction,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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
          borderRadius: isMobile ? 16 : 18,
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
        }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          wrap='wrap'
          gap={12}
        >
          <Space align='center' size={10}>
            <div
              style={{
                width: isMobile ? 38 : 42,
                height: isMobile ? 38 : 42,
                display: "grid",
                placeItems: "center",
                borderRadius: 15,
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <CreditCard size={18} />
            </div>
            <Space direction='vertical' size={2} style={{ minWidth: 0 }}>
              <Text strong style={{ color: "#0f172a", fontSize: isMobile ? 15 : 16 }}>
                Pembayaran SPP
              </Text>
              <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                Pilih lebih dari satu bulan bila siswa membayar sekaligus.
              </Text>
            </Space>
          </Space>
          <Tag color='blue' style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}>
            Tarif {currencyFormatter.format(tariffAmount)}
          </Tag>
        </Flex>
      </Card>

      <Form.Item name='bill_months' noStyle>
        <Checkbox.Group style={{ width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              width: "100%",
            }}
          >
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
                      height: "100%",
                    }}
                    styles={{ body: { padding: isMobile ? 14 : 16 } }}
                  >
                    <Checkbox value={month.value} style={{ width: "100%" }}>
                      <Space direction='vertical' size={2}>
                        <Text strong>{month.label}</Text>
                        <ScholarshipAmountCell
                          amount={
                            month.amount_due != null
                              ? month.amount_due
                              : tariffAmount
                          }
                          brutoAmount={month.bruto_amount ?? tariffAmount}
                          scholarshipCover={month.scholarship_cover}
                          hasScholarship={month.has_scholarship}
                        />
                      </Space>
                    </Checkbox>
                  </Card>
                </MotionDiv>
              );
            })}
          </div>
        </Checkbox.Group>
      </Form.Item>
    </Flex>
  );
};

export default TransactionStepSpp;
