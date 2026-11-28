import { Button, Card, Empty, Flex, Progress, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { CalendarClock, CreditCard, ReceiptText } from "lucide-react";
import {
  currencyFormatter,
  dateFormatter,
  statusMetaMap,
} from "./parentTransactionShared";
import ScholarshipAmountCell from "../../../fee/ScholarshipAmountCell";

import { museColors, museRadius, museShadow } from "../../../../../config/theme";
const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const ParentPaymentList = ({
  title,
  description,
  items,
  emptyTitle,
  onOpenInvoice,
  onPay,
  paymentEnabled = true,
}) => {
  if (!items?.length) {
    return (
      <Card
        variant='borderless'
        style={{
          borderRadius: museRadius.card,
          border: `1px solid ${museColors.divider}`,
          boxShadow: museShadow.card,
        }}
      >
        <Empty description={emptyTitle} />
      </Card>
    );
  }

  return (
    <Space direction='vertical' size={18} style={{ width: "100%" }}>
      <div>
        <Title level={4} style={{ marginBottom: 6 }}>
          {title}
        </Title>
        <Paragraph type='secondary' style={{ marginBottom: 0 }}>
          {description}
        </Paragraph>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((item, index) => {
          const statusMeta = statusMetaMap[item.status] || statusMetaMap.unpaid;
          const progressPercent =
            Number(item.amount_due || 0) > 0
              ? Math.min(
                  Math.round(
                    (Number(item.paid_amount || 0) / Number(item.amount_due || 1)) *
                      100,
                  ),
                  100,
                )
              : 0;

          return (
            <MotionDiv
              key={item.key || item.invoice_id || item.charge_id || item.bill_month}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
                variant='borderless'
                style={{
                  height: "100%",
                  borderRadius: museRadius.card,
                  border: `1px solid ${museColors.divider}`,
                  boxShadow: museShadow.card,
                  background: "#ffffff",
                }}
                styles={{ body: { padding: 20 } }}
              >
                <Flex vertical gap={16}>
                  <Flex align='flex-start' justify='space-between' gap={10}>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          color: museColors.success,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.billing_period_label || item.type_name || "Tagihan"}
                      </div>
                      <Title level={5} style={{ margin: "4px 0 0" }}>
                        {item.description || "-"}
                      </Title>
                    </div>
                    <Tag
                      color={statusMeta.color}
                      style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
                    >
                      {statusMeta.label}
                    </Tag>
                  </Flex>

                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: museRadius.card,
                      background:
                        museColors.primarySoft,
                      border: "1px solid rgba(59,130,246,0.12)",
                    }}
                  >
                    <Flex justify='space-between' gap={12} wrap='wrap'>
                      <div>
                        <Text type='secondary'>Total Tagihan</Text>
                        <div style={{ marginTop: 4 }}>
                          <ScholarshipAmountCell
                            amount={item.amount_due}
                            brutoAmount={item.bruto_amount}
                            scholarshipCover={item.scholarship_cover}
                            hasScholarship={item.has_scholarship}
                          />
                        </div>
                      </div>
                      <div>
                        <Text type='secondary'>Sudah Dibayar</Text>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 18,
                            fontWeight: 700,
                            color: museColors.success,
                          }}
                        >
                          {currencyFormatter.format(Number(item.paid_amount || 0))}
                        </div>
                      </div>
                    </Flex>
                    <Progress
                      percent={progressPercent}
                      showInfo={false}
                      strokeColor={museColors.success}
                      trailColor={museColors.divider}
                      style={{ marginTop: 14, marginBottom: 8 }}
                    />
                    <Text type='secondary'>
                      Sisa {currencyFormatter.format(Number(item.remaining_amount || 0))}
                    </Text>
                    {item.status === "pending" ? (
                      <Text type='secondary' style={{ display: "block", marginTop: 8 }}>
                        Pembayaran sedang diproses sejak{" "}
                        {dateFormatter(item.last_pending_at, true)}.
                      </Text>
                    ) : null}
                  </div>

                  <Space direction='vertical' size={8} style={{ width: "100%" }}>
                    <Flex align='center' gap={8}>
                      <CalendarClock size={15} color={museColors.muted} />
                      <Text type='secondary'>
                        Pembayaran terakhir: {dateFormatter(item.last_paid_at, true)}
                      </Text>
                    </Flex>
                    {item.installments?.length ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: museRadius.card,
                          background: museColors.bgLayout,
                          border: `1px dashed ${museColors.border}`,
                        }}
                      >
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                          Riwayat cicilan
                        </Text>
                        <Space direction='vertical' size={6} style={{ width: "100%" }}>
                          {item.installments.slice(0, 3).map((installment) => (
                            <Flex
                              key={installment.payment_id || installment.payment_date}
                              justify='space-between'
                              gap={12}
                            >
                              <Text type='secondary'>
                                {dateFormatter(installment.payment_date, true)}
                              </Text>
                              <Text strong>
                                {currencyFormatter.format(
                                  Number(installment.allocated_amount || 0),
                                )}
                              </Text>
                            </Flex>
                          ))}
                        </Space>
                      </div>
                    ) : null}
                  </Space>

                  <Space direction='vertical' size={10} style={{ width: "100%" }}>
                    {item.invoice_no ? (
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        Invoice: {item.invoice_no}
                      </Text>
                    ) : null}
                    <Button
                      type='primary'
                      icon={<CreditCard size={16} />}
                      onClick={() => onPay(item)}
                      disabled={
                        !paymentEnabled ||
                        !item.can_pay ||
                        Number(item.remaining_amount || 0) <= 0
                      }
                      block
                    >
                      {item.status === "pending"
                        ? "Menunggu Verifikasi"
                        : paymentEnabled
                          ? "Bayar"
                          : "Metode Belum Tersedia"}
                    </Button>
                    <Button
                      icon={<ReceiptText size={16} />}
                      onClick={() => onOpenInvoice(item)}
                      disabled={!item.can_view_invoice || !item.invoice_id}
                      block
                    >
                      Lihat Invoice
                    </Button>
                  </Space>
                </Flex>
              </Card>
            </MotionDiv>
          );
        })}
      </div>
    </Space>
  );
};

export default ParentPaymentList;
