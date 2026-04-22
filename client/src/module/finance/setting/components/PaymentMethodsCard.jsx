import {
  Alert,
  Button,
  Card,
  Flex,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Building2, CreditCard, Settings2, Wallet } from "lucide-react";
import { cardStyle } from "../../fee/others/constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const resolveMethodIcon = (methodType) => {
  if (methodType === "manual_bank") {
    return <Building2 size={18} />;
  }

  if (methodType === "midtrans") {
    return <CreditCard size={18} />;
  }

  return <Wallet size={18} />;
};

const PaymentMethodsCard = ({
  paymentMethods,
  manualBankMethod,
  midtransMethod,
  bankAccounts,
  isUpdatingPaymentMethod,
  onTogglePaymentMethod,
  onOpenMidtransTab,
  onOpenBankTab,
}) => {
  const activeBankAccounts = (bankAccounts || []).filter((item) => item.is_active);

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          ...cardStyle,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Space vertical size={14} style={{ width: "100%" }}>
          <div
            style={{
              padding: 20,
              borderRadius: 22,
              border: "1px solid rgba(59,130,246,0.14)",
              background:
                "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(240,253,250,0.94))",
            }}
          >
            <Flex justify='space-between' align='flex-start' wrap='wrap' gap={16}>
              <Flex align='flex-start' gap={14} style={{ flex: 1 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: "0 18px 30px rgba(29, 78, 216, 0.2)",
                  }}
                >
                  <Settings2 size={22} />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Kontrol Metode Pembayaran
                  </Title>
                  <Paragraph
                    type='secondary'
                    style={{ margin: "6px 0 0", maxWidth: 720 }}
                  >
                    Tentukan jalur pembayaran yang dibuka untuk orang tua.
                    Prioritas parent mengikuti Midtrans terlebih dahulu, lalu
                    transfer bank manual jika Midtrans tidak aktif.
                  </Paragraph>
                </div>
              </Flex>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 18,
                  background: "#ffffff",
                  border: "1px solid rgba(148,163,184,0.16)",
                  minWidth: 220,
                }}
              >
                <Text type='secondary'>Metode terdaftar</Text>
                <Title level={5} style={{ margin: "6px 0 0" }}>
                  {(paymentMethods || []).length} kanal
                </Title>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {(paymentMethods || []).filter((item) => item.is_active).length} aktif
                </div>
              </div>
            </Flex>
          </div>

          {!midtransMethod?.is_active && !manualBankMethod?.is_active ? (
            <Alert
              type='warning'
              showIcon
              message='Metode pembayaran parent sedang tidak tersedia'
              description='Aktifkan Midtrans atau transfer bank agar orang tua dapat melakukan pembayaran dari portal parent.'
              style={{ borderRadius: 16 }}
            />
          ) : null}

          {manualBankMethod?.is_active && activeBankAccounts.length === 0 ? (
            <Alert
              type='error'
              showIcon
              message='Transfer bank aktif tanpa rekening bank aktif'
              description='Buka tab Rekening Bank dan aktifkan minimal satu rekening tujuan agar pembayaran transfer manual dapat dipakai orang tua.'
              style={{ borderRadius: 16 }}
            />
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {(paymentMethods || []).map((item) => {
              const isManualBank = item.method_type === "manual_bank";
              const isMidtrans = item.method_type === "midtrans";

              return (
                <Card
                  key={item.method_type}
                  size='small'
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
                    background: "#ffffff",
                    height: "100%",
                  }}
                >
                  <Flex vertical gap={14}>
                    <Flex justify='space-between' align='flex-start' gap={12}>
                      <Flex align='center' gap={12}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 14,
                            background:
                              "linear-gradient(135deg, #dbeafe, #dcfce7)",
                            color: "#0f766e",
                            flexShrink: 0,
                          }}
                        >
                          {resolveMethodIcon(item.method_type)}
                        </div>
                        <div>
                          <Text strong>{item.name}</Text>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            {item.method_type}
                          </div>
                        </div>
                      </Flex>
                      <Tag
                        color={item.is_active ? "green" : "default"}
                        style={{ borderRadius: 999, fontWeight: 700 }}
                      >
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Tag>
                    </Flex>

                    <Text type='secondary' style={{ fontSize: 13 }}>
                      {item.description}
                    </Text>

                    {isManualBank ? (
                      <>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {activeBankAccounts.length} rekening aktif tersedia
                        </div>
                        <Flex justify='space-between' align='center' gap={12}>
                          <div>
                            <Text strong>Terima transfer bank</Text>
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              Orang tua upload bukti transfer, lalu admin konfirmasi
                            </div>
                          </div>
                          <Switch
                            checked={item.is_active}
                            loading={isUpdatingPaymentMethod}
                            onChange={(checked) =>
                              onTogglePaymentMethod?.("manual_bank", checked)
                            }
                          />
                        </Flex>
                        <Button onClick={onOpenBankTab} block>
                          Kelola Rekening Bank
                        </Button>
                      </>
                    ) : null}

                    {isMidtrans ? (
                      <>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {item.is_configured
                            ? "Kredensial Midtrans sudah tersedia"
                            : "Kredensial Midtrans belum lengkap"}
                        </div>
                        <Button type='primary' ghost onClick={onOpenMidtransTab} block>
                          Buka Pengaturan Midtrans
                        </Button>
                      </>
                    ) : null}

                    {!isManualBank && !isMidtrans ? (
                      <Alert
                        type='info'
                        showIcon
                        message='Metode internal admin'
                        description='Metode ini dipakai untuk input pembayaran langsung oleh admin keuangan dan tidak muncul di portal parent.'
                        style={{ borderRadius: 14 }}
                      />
                    ) : null}
                  </Flex>
                </Card>
              );
            })}
          </div>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default PaymentMethodsCard;
