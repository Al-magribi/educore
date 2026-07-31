import {
  Card,
  Descriptions,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";

import { currencyFormatter } from "./transactionFormShared.jsx";
import ScholarshipAmountCell from "../../ScholarshipAmountCell";

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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const monthMap = new Map(
    unpaidMonths.map((item) => [Number(item.value), item]),
  );

  return (
    <Flex vertical gap={18}>
      <Card
        style={{ borderRadius: isMobile ? 16 : 18 }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <Descriptions
          title='Konfirmasi Siswa'
          column={{ xs: 1, sm: 2 }}
          size={isMobile ? "small" : "default"}
          items={[
            { key: "nama", label: "Nama", children: student?.student_name || "-" },
            { key: "nis", label: "NIS", children: student?.nis || "-" },
            { key: "kelas", label: "Kelas", children: student?.class_name || "-" },
            { key: "tingkat", label: "Tingkat", children: student?.grade_name || "-" },
            { key: "periode", label: "Periode", children: student?.periode_name || "-" },
          ]}
        />
      </Card>

      <Card
        style={{ borderRadius: isMobile ? 16 : 18 }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <Space direction='vertical' size={10} style={{ width: "100%" }}>
          <Text strong style={{ fontSize: isMobile ? 15 : 16, color: "#0f172a" }}>
            Rincian Pembayaran
          </Text>

          {monthlySelection.length > 0 ? (
            <Flex vertical gap={8}>
              <Text strong>SPP</Text>
              <Space direction='vertical' size={6} style={{ width: "100%" }}>
                {monthlySelection.map((month) => {
                  const monthMeta = monthMap.get(Number(month));
                  const amountDue = Number(
                    monthMeta?.amount_due != null
                      ? monthMeta.amount_due
                      : tariffAmount,
                  );
                  return (
                    <Flex
                      key={month}
                      justify='space-between'
                      align='center'
                      gap={12}
                      wrap='wrap'
                    >
                      <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
                        {monthMeta?.label || `Bulan ${month}`}
                      </Tag>
                      <ScholarshipAmountCell
                        amount={amountDue}
                        brutoAmount={monthMeta?.bruto_amount ?? tariffAmount}
                        scholarshipCover={monthMeta?.scholarship_cover}
                        hasScholarship={monthMeta?.has_scholarship}
                      />
                    </Flex>
                  );
                })}
              </Space>
              <Text type='secondary'>
                Subtotal SPP {currencyFormatter.format(totalMonthlyAmount)}
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
                      <Space direction='vertical' size={2} style={{ minWidth: 0, flex: 1 }}>
                        <Text strong style={{ wordBreak: "break-word" }}>
                          {item.type_name}
                        </Text>
                        <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                          {item.description || "Pembayaran lainnya"}
                        </Text>
                      </Space>
                      <Text strong style={{ flexShrink: 0 }}>
                        {currencyFormatter.format(item.amount_paid)}
                      </Text>
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
        style={{ borderRadius: isMobile ? 16 : 18 }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <Form.Item
          name='notes'
          label='Catatan'
          style={{ marginBottom: 0 }}
          extra='Opsional. Catatan tersimpan pada transaksi pembayaran.'
        >
          <Input.TextArea
            rows={3}
            placeholder='Contoh: dibayar tunai di loket, transfer sebagian, atau keterangan lain.'
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: isMobile ? 16 : 20,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <Flex vertical gap={10}>
          <Flex justify='space-between' gap={12}>
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>Total SPP</Text>
            <Text strong style={{ color: "#ffffff", wordBreak: "break-word" }}>
              {currencyFormatter.format(totalMonthlyAmount)}
            </Text>
          </Flex>
          <Flex justify='space-between' gap={12}>
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>Total Lainnya</Text>
            <Text strong style={{ color: "#ffffff", wordBreak: "break-word" }}>
              {currencyFormatter.format(selectedOtherTotal)}
            </Text>
          </Flex>
          <Flex justify='space-between' align='center' gap={12}>
            <Text strong style={{ color: "#ffffff", fontSize: isMobile ? 15 : 16 }}>
              Total Bayar
            </Text>
            <Text
              strong
              style={{
                color: "#ffffff",
                fontSize: isMobile ? 18 : 22,
                wordBreak: "break-word",
              }}
            >
              {currencyFormatter.format(grandTotal)}
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

export default TransactionStepConfirm;
