import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  InputNumber,
  Modal,
  Radio,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  Building2,
  CreditCard,
  Landmark,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { currencyFormatter } from "./parentTransactionShared";

const { Paragraph, Text, Title } = Typography;

const ParentPaymentCheckoutModal = ({
  open,
  item,
  student,
  paymentSetup,
  submitting,
  onClose,
  onSubmit,
}) => {
  const [selectedBankAccountId, setSelectedBankAccountId] = useState();
  const [proofFileList, setProofFileList] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState(
    item?.item_type === "other" ? Number(item.remaining_amount || 0) : undefined,
  );

  const paymentMode = paymentSetup?.mode || "unavailable";
  const effectiveBankAccountId =
    selectedBankAccountId || paymentSetup?.bank_accounts?.[0]?.id;
  const selectedProofFile = proofFileList[0]?.originFileObj || null;
  const isOtherPayment = item?.item_type === "other";
  const effectivePaymentAmount = isOtherPayment
    ? Number(paymentAmount || 0)
    : Number(item?.remaining_amount || 0);
  const isValidOtherPaymentAmount =
    !isOtherPayment ||
    (effectivePaymentAmount > 0 &&
      effectivePaymentAmount <= Number(item?.remaining_amount || 0));

  const title = useMemo(() => {
    if (!item) {
      return "Pembayaran";
    }

    return item.item_type === "spp"
      ? `Bayar SPP ${item.billing_period_label || ""}`.trim()
      : `Bayar ${item.description || "Tagihan"}`;
  }, [item]);

  const handleConfirm = () => {
    if (!item || !student) {
      return;
    }

    onSubmit({
      item,
      paymentMode,
      bankAccountId: effectiveBankAccountId,
      proofFile: selectedProofFile,
      paymentAmount: effectivePaymentAmount,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title='Pembayaran Tagihan'
      destroyOnHidden
      closable
      centered
    >
      {!item ? null : (
        <Space vertical size={18} style={{ width: "100%" }}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.14)",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 22%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <Flex justify='space-between' gap={16} wrap='wrap'>
              <Space vertical size={6}>
                <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
                  {item.item_type === "spp" ? "SPP" : "Pembayaran Lainnya"}
                </Tag>
                <Title level={4} style={{ margin: 0 }}>
                  {title}
                </Title>
                <Paragraph type='secondary' style={{ marginBottom: 0 }}>
                  {student.student_name} - {student.homebase_name || "Satuan"}
                </Paragraph>
              </Space>
              <div style={{ minWidth: 220 }}>
                <Text type='secondary'>Sisa yang Dibayar</Text>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {currencyFormatter.format(Number(item.remaining_amount || 0))}
                </div>
              </div>
            </Flex>
          </Card>

          {paymentMode === "midtrans" ? (
            <Card
              variant='borderless'
              style={{
                borderRadius: 24,
                border: "1px solid rgba(16,185,129,0.16)",
                background:
                  "linear-gradient(135deg, rgba(236,253,245,0.9), rgba(239,246,255,0.9))",
              }}
            >
              <Space vertical size={12} style={{ width: "100%" }}>
                <Space align='start' size={12}>
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(15,118,110,0.12)",
                      color: "#0f766e",
                    }}
                  >
                    <CreditCard size={20} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      Pembayaran Online dengan Midtrans
                    </div>
                    <Text type='secondary'>
                      Tagihan ini akan diarahkan ke Midtrans Snap sesuai
                      pengaturan satuan siswa.
                    </Text>
                  </div>
                </Space>
                <Alert
                  type='success'
                  showIcon
                  message='Checkout aman dan terverifikasi'
                  description='Setelah menekan tombol bayar, Anda akan diarahkan ke halaman Midtrans untuk menyelesaikan pembayaran.'
                />
              </Space>
            </Card>
          ) : null}

          {paymentMode === "bank_transfer" ? (
            <Space vertical size={16} style={{ width: "100%" }}>
              <Card
                variant='borderless'
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(59,130,246,0.14)",
                }}
              >
                <Space vertical size={14} style={{ width: "100%" }}>
                  <Space align='start' size={12}>
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(59,130,246,0.12)",
                        color: "#1d4ed8",
                      }}
                    >
                      <Landmark size={20} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        Transfer ke Rekening Satuan
                      </div>
                    <Text type='secondary'>
                      Pilih rekening aktif sesuai satuan siswa, lalu unggah
                      bukti transfer agar tim keuangan dapat memverifikasi pembayaran ini sebelum dikonfirmasi.
                    </Text>
                    </div>
                  </Space>

                  <Radio.Group
                    value={effectiveBankAccountId}
                    onChange={(event) =>
                      setSelectedBankAccountId(event.target.value)
                    }
                    style={{ width: "100%" }}
                  >
                    <Space vertical size={12} style={{ width: "100%" }}>
                      {(paymentSetup?.bank_accounts || []).map((account) => (
                        <Radio
                          key={account.id}
                          value={account.id}
                          style={{
                            width: "100%",
                            marginInlineStart: 0,
                            padding: 14,
                            borderRadius: 18,
                            border: "1px solid rgba(148,163,184,0.18)",
                          }}
                        >
                          <Flex justify='space-between' gap={12} wrap='wrap'>
                            <Space vertical size={2}>
                              <Text strong>{account.bank_name}</Text>
                              <Text>{account.account_number}</Text>
                              <Text type='secondary'>
                                a.n. {account.account_name}
                              </Text>
                            </Space>
                            <Space size={8}>
                              <Building2 size={16} color='#64748b' />
                              <Text type='secondary'>
                                {account.branch || "-"}
                              </Text>
                            </Space>
                          </Flex>
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </Space>
              </Card>

              <Card
                variant='borderless'
                style={{
                  borderRadius: 24,
                  border: "1px dashed rgba(148,163,184,0.3)",
                }}
              >
                <Space vertical size={12} style={{ width: "100%" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      Upload Bukti Transfer
                    </div>
                    <Text type='secondary'>
                      File gambar atau PDF diterima. Bukti transfer wajib ada
                      untuk metode rekening bank. Setelah dikirim, status pembayaran akan menunggu verifikasi admin.
                    </Text>
                  </div>

                  <Upload
                    beforeUpload={() => false}
                    maxCount={1}
                    fileList={proofFileList}
                    onChange={({ fileList }) => setProofFileList(fileList)}
                  >
                    <Button icon={<UploadCloud size={16} />}>
                      Pilih Bukti Transfer
                    </Button>
                  </Upload>
                </Space>
              </Card>
            </Space>
          ) : null}

          {paymentMode === "unavailable" ? (
            <Alert
              type='warning'
              showIcon
              message='Metode pembayaran belum tersedia'
              description='Satuan siswa ini belum memiliki konfigurasi Midtrans atau rekening bank aktif.'
            />
          ) : null}

          {isOtherPayment ? (
            <Card
              variant='borderless'
              style={{
                borderRadius: 24,
                border: "1px solid rgba(148,163,184,0.14)",
              }}
            >
              <Space vertical size={10} style={{ width: "100%" }}>
                <Space align='center' size={10}>
                  <ShieldCheck size={18} color='#0f766e' />
                  <Text strong>Nominal yang Akan Dibayar</Text>
                </Space>
                <Text type='secondary'>
                  Pembayaran lainnya boleh dibayar sebagian sebagai cicilan.
                  Maksimal sebesar sisa tagihan yang masih terbuka.
                </Text>
                <InputNumber
                  value={paymentAmount}
                  onChange={(value) => setPaymentAmount(Number(value || 0))}
                  min={1}
                  max={Number(item?.remaining_amount || 0)}
                  size='large'
                  style={{ width: "100%" }}
                  placeholder='Masukkan nominal cicilan'
                  formatter={(value) => {
                    const numericValue = String(value || "").replace(/\D/g, "");
                    return numericValue
                      ? `Rp ${Number(numericValue).toLocaleString("id-ID")}`
                      : "";
                  }}
                  parser={(value) => String(value || "").replace(/\D/g, "")}
                />
                {!isValidOtherPaymentAmount ? (
                  <Alert
                    type='warning'
                    showIcon
                    message='Nominal cicilan belum valid'
                    description={`Masukkan nominal lebih dari Rp 0 dan tidak melebihi ${currencyFormatter.format(
                      Number(item?.remaining_amount || 0),
                    )}.`}
                  />
                ) : null}
              </Space>
            </Card>
          ) : null}

          <Flex justify='flex-end' gap={12} wrap='wrap'>
            <Button onClick={onClose}>Batal</Button>
            <Button
              type='primary'
              loading={submitting}
              disabled={
                paymentMode === "unavailable" ||
                !isValidOtherPaymentAmount ||
                (paymentMode === "bank_transfer" &&
                  (!effectiveBankAccountId || !selectedProofFile))
              }
              onClick={handleConfirm}
            >
              {paymentMode === "midtrans"
                ? "Lanjut ke Midtrans"
                : paymentMode === "bank_transfer"
                  ? "Kirim Bukti Transfer"
                  : "Bayar"}
            </Button>
          </Flex>
        </Space>
      )}
    </Modal>
  );
};

export default ParentPaymentCheckoutModal;
