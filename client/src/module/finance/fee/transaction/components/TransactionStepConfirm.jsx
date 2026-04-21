import { Card, Descriptions, Empty, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";

import { currencyFormatter } from "./transactionFormShared.jsx";

const { Text } = Typography;
const MotionDiv = motion.div;

const TransactionStepConfirm = ({
  student,
  monthlySelection,
  unpaidMonths,
  tariffAmount,
  selectedOtherPayments,
  totalMonthlyAmount,
  selectedOtherTotal,
  grandTotal,
}) => {
  const monthMap = new Map(unpaidMonths.map((item) => [item.value, item.label]));

  return (
    <Flex vertical gap={18}>
      <Card style={{ borderRadius: 18 }}>
        <Descriptions
          title='Konfirmasi Siswa'
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: "nama", label: "Nama", children: student?.student_name || "-" },
            { key: "nis", label: "NIS", children: student?.nis || "-" },
            { key: "kelas", label: "Kelas", children: student?.class_name || "-" },
            { key: "tingkat", label: "Tingkat", children: student?.grade_name || "-" },
            { key: "periode", label: "Periode", children: student?.periode_name || "-" },
          ]}
        />
      </Card>

      <Card style={{ borderRadius: 18 }}>
        <Space direction='vertical' size={10} style={{ width: "100%" }}>
          <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
            Rincian Pembayaran
          </Text>

          {monthlySelection.length > 0 ? (
            <Flex vertical gap={8}>
              <Text strong>SPP</Text>
              <Space wrap>
                {monthlySelection.map((month) => (
                  <Tag
                    key={month}
                    color='blue'
                    style={{ borderRadius: 999, fontWeight: 600 }}
                  >
                    {monthMap.get(month) || `Bulan ${month}`}
                  </Tag>
                ))}
              </Space>
              <Text type='secondary'>
                {`${monthlySelection.length} bulan x ${currencyFormatter.format(tariffAmount)}`}
              </Text>
            </Flex>
          ) : null}

          {selectedOtherPayments.length > 0 ? (
            <Flex vertical gap={8}>
              <Text strong>Pembayaran Lainnya</Text>
              {selectedOtherPayments.map((item, index) => (
                <MotionDiv
                  key={`${item.type_id}-${item.charge_id || "new"}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    size='small'
                    style={{ borderRadius: 14, background: "#f8fafc" }}
                  >
                    <Flex justify='space-between' align='start' gap={12}>
                      <Space direction='vertical' size={2}>
                        <Text strong>{item.type_name}</Text>
                        <Text type='secondary'>
                          {item.description || "Pembayaran lainnya"}
                        </Text>
                      </Space>
                      <Text strong>{currencyFormatter.format(item.amount_paid)}</Text>
                    </Flex>
                  </Card>
                </MotionDiv>
              ))}
            </Flex>
          ) : null}

          {monthlySelection.length === 0 && selectedOtherPayments.length === 0 ? (
            <Empty description='Belum ada item pembayaran yang dipilih' />
          ) : null}
        </Space>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        <Flex vertical gap={10}>
          <Flex justify='space-between'>
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>Total SPP</Text>
            <Text strong style={{ color: "#ffffff" }}>
              {currencyFormatter.format(totalMonthlyAmount)}
            </Text>
          </Flex>
          <Flex justify='space-between'>
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>Total Lainnya</Text>
            <Text strong style={{ color: "#ffffff" }}>
              {currencyFormatter.format(selectedOtherTotal)}
            </Text>
          </Flex>
          <Flex justify='space-between' align='center'>
            <Text strong style={{ color: "#ffffff", fontSize: 16 }}>
              Total Bayar
            </Text>
            <Text strong style={{ color: "#ffffff", fontSize: 22 }}>
              {currencyFormatter.format(grandTotal)}
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

export default TransactionStepConfirm;
