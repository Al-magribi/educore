import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Grid,
  Image,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileSignature,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import {
  currencyFormatter,
  dateFormatter,
  statusMetaMap,
} from "./parentTransactionShared";

const { Paragraph, Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const modalMotionProps = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.98 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      staggerChildren: 0.07,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

const summaryCardStyle = {
  borderRadius: 22,
  height: "100%",
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 18px 34px rgba(15,23,42,0.06)",
};

const ParentInvoiceModal = ({
  open,
  invoiceId,
  invoiceData,
  loading,
  onClose,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const invoice = invoiceData?.invoice;
  const officer = invoiceData?.officer;
  const items = invoiceData?.items || [];
  const payments = invoiceData?.payments || [];
  const statusMeta = statusMetaMap[invoice?.status] || statusMetaMap.unpaid;

  const summaryItems = [
    {
      key: "total_due",
      label: "Total Tagihan",
      value: currencyFormatter.format(Number(invoice?.total_due || 0)),
      note: "Akumulasi nominal pada invoice ini.",
      icon: <WalletCards size={18} />,
      background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
      color: "#1d4ed8",
    },
    {
      key: "total_paid",
      label: "Sudah Dibayar",
      value: currencyFormatter.format(Number(invoice?.total_paid || 0)),
      note: "Nominal yang sudah dialokasikan.",
      icon: <BadgeCheck size={18} />,
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      color: "#15803d",
    },
    {
      key: "payments",
      label: "Riwayat Pembayaran",
      value: payments.length,
      note: "Transaksi yang tercatat pada invoice.",
      icon: <CreditCard size={18} />,
      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
      color: "#c2410c",
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1120}
      title={null}
      destroyOnHidden
      centered
      styles={{
        body: { padding: isMobile ? 14 : 18 },
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 30,
        },
      }}
      modalRender={(node) => <MotionDiv {...modalMotionProps}>{node}</MotionDiv>}
    >
      {loading ? (
        <div style={{ padding: "56px 0", textAlign: "center" }}>
          <Spin size='large' />
        </div>
      ) : !invoiceId || !invoice ? (
        <div style={{ padding: isMobile ? 24 : 32 }}>
          <Empty description='Invoice belum dipilih' />
        </div>
      ) : (
        <MotionDiv
          initial='hidden'
          animate='show'
          variants={containerVariants}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <MotionDiv variants={itemVariants}>
            <Card
              variant='borderless'
              style={{
                borderRadius: 30,
                overflow: "hidden",
                background:
                  "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)",
                boxShadow: "0 24px 56px rgba(15,23,42,0.18)",
              }}
              styles={{ body: { padding: isMobile ? 20 : 28 } }}
            >
              <Flex
                align='flex-start'
                justify='space-between'
                gap={20}
                wrap='wrap'
              >
                <Space direction='vertical' size={12} style={{ maxWidth: 760 }}>
                  <Flex align='center' gap={10} wrap='wrap'>
                    <Tag
                      color='cyan'
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        fontWeight: 700,
                      }}
                    >
                      Invoice Pembayaran
                    </Tag>
                    <Tag
                      color={statusMeta.color}
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        fontWeight: 700,
                      }}
                    >
                      {statusMeta.label}
                    </Tag>
                    <Flex
                      align='center'
                      gap={6}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#dbeafe",
                        fontWeight: 600,
                      }}
                    >
                      <ReceiptText size={14} />
                      <span>{invoice.invoice_no}</span>
                    </Flex>
                  </Flex>

                  <Title
                    level={isMobile ? 3 : 2}
                    style={{ margin: 0, color: "#fff", lineHeight: 1.12 }}
                  >
                    Invoice {invoice.student_name}
                  </Title>

                  <Paragraph
                    style={{
                      marginBottom: 0,
                      color: "rgba(255,255,255,0.82)",
                      fontSize: 15,
                      maxWidth: 760,
                    }}
                  >
                    Dokumen ini menampilkan rincian item pembayaran, histori
                    alokasi dana, status verifikasi, serta identitas petugas
                    keuangan yang tercantum pada invoice resmi.
                  </Paragraph>
                </Space>

                <Card
                  variant='borderless'
                  style={{
                    width: 320,
                    maxWidth: "100%",
                    borderRadius: 24,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(10px)",
                  }}
                  styles={{ body: { padding: 22 } }}
                >
                  <Space direction='vertical' size={12} style={{ width: "100%" }}>
                    <Flex align='center' gap={8}>
                      <CalendarClock size={16} color='#bfdbfe' />
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                        Ringkasan invoice
                      </Text>
                    </Flex>
                    <Title level={4} style={{ margin: 0, color: "#fff" }}>
                      {currencyFormatter.format(Number(invoice.total_due || 0))}
                    </Title>
                    <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                      Tanggal invoice: {dateFormatter(invoice.issue_date)}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                      Periode: {invoice.periode_name || "-"}
                    </Text>
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 18,
                        background: "rgba(15,23,42,0.16)",
                        color: "#e2e8f0",
                      }}
                    >
                      {items.length} item pembayaran dan {payments.length} histori
                      transaksi terhubung ke invoice ini.
                    </div>
                  </Space>
                </Card>
              </Flex>
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {summaryItems.map((item) => (
                <Card
                  key={item.key}
                  variant='borderless'
                  style={summaryCardStyle}
                  styles={{ body: { padding: 20 } }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 16,
                      background: item.background,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                  <Text type='secondary'>{item.label}</Text>
                  <Title level={isMobile ? 5 : 4} style={{ margin: "8px 0 4px" }}>
                    {item.value}
                  </Title>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {item.note}
                  </Text>
                </Card>
              ))}
            </div>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Card
              variant='borderless'
              style={{
                borderRadius: 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
              }}
              styles={{ body: { padding: isMobile ? 16 : 20 } }}
            >
              <Descriptions
                bordered
                column={{ xs: 1, md: 2 }}
                labelStyle={{ fontWeight: 700, width: 170 }}
              >
                <Descriptions.Item label='Nama Siswa'>
                  {invoice.student_name}
                </Descriptions.Item>
                <Descriptions.Item label='NIS'>
                  {invoice.nis || "-"}
                </Descriptions.Item>
                <Descriptions.Item label='Satuan'>
                  {invoice.homebase_name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label='Kelas'>
                  {invoice.grade_name || "-"} {invoice.class_name || ""}
                </Descriptions.Item>
                <Descriptions.Item label='Periode'>
                  {invoice.periode_name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label='Tanggal Invoice'>
                  {dateFormatter(invoice.issue_date)}
                </Descriptions.Item>
                <Descriptions.Item label='Total Tagihan'>
                  {currencyFormatter.format(Number(invoice.total_due || 0))}
                </Descriptions.Item>
                <Descriptions.Item label='Sudah Dibayar'>
                  {currencyFormatter.format(Number(invoice.total_paid || 0))}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Card
              title='Rincian Item'
              variant='borderless'
              style={{
                borderRadius: 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                rowKey='id'
                dataSource={items}
                pagination={false}
                scroll={{ x: 720 }}
                locale={{ emptyText: "Belum ada item pembayaran pada invoice ini." }}
                columns={[
                  {
                    title: "Item",
                    dataIndex: "description",
                    key: "description",
                    render: (_, record) => (
                      <Space vertical size={0}>
                        <Text strong>{record.description}</Text>
                        <Text type='secondary'>
                          {record.billing_period_label ||
                            record.component_name ||
                            "-"}
                        </Text>
                      </Space>
                    ),
                  },
                  {
                    title: "Nominal",
                    dataIndex: "amount_due",
                    key: "amount_due",
                    render: (value) =>
                      currencyFormatter.format(Number(value || 0)),
                  },
                  {
                    title: "Dibayar",
                    dataIndex: "paid_amount",
                    key: "paid_amount",
                    render: (value) =>
                      currencyFormatter.format(Number(value || 0)),
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (value) => {
                      const meta = statusMetaMap[value] || statusMetaMap.unpaid;
                      return (
                        <Tag
                          color={meta.color}
                          style={{
                            margin: 0,
                            borderRadius: 999,
                            fontWeight: 700,
                          }}
                        >
                          {meta.label}
                        </Tag>
                      );
                    },
                  },
                ]}
              />
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Card
              title='Riwayat Pembayaran'
              variant='borderless'
              style={{
                borderRadius: 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                rowKey='id'
                dataSource={payments}
                pagination={false}
                scroll={{ x: 980 }}
                locale={{ emptyText: "Belum ada pembayaran yang masuk." }}
                columns={[
                  {
                    title: "Tanggal",
                    dataIndex: "payment_date",
                    key: "payment_date",
                    render: (value) => dateFormatter(value, true),
                  },
                  {
                    title: "Kanal",
                    dataIndex: "payment_channel",
                    key: "payment_channel",
                  },
                  {
                    title: "Alokasi ke Invoice",
                    dataIndex: "allocated_amount",
                    key: "allocated_amount",
                    render: (value) =>
                      currencyFormatter.format(Number(value || 0)),
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (value) => {
                      const meta = statusMetaMap[value] || statusMetaMap.unpaid;
                      return (
                        <Tag
                          color={meta.color}
                          style={{
                            margin: 0,
                            borderRadius: 999,
                            fontWeight: 700,
                          }}
                        >
                          {meta.label}
                        </Tag>
                      );
                    },
                  },
                  {
                    title: "Referensi",
                    dataIndex: "reference_no",
                    key: "reference_no",
                    render: (value) => value || "-",
                  },
                  {
                    title: "Catatan",
                    dataIndex: "notes",
                    key: "notes",
                    render: (value, record) => {
                      if (value) {
                        return (
                          <Text style={{ whiteSpace: "pre-wrap" }}>{value}</Text>
                        );
                      }

                      if (record.status === "pending") {
                        return (
                          <Text type='secondary'>
                            Pembayaran sedang menunggu verifikasi admin.
                          </Text>
                        );
                      }

                      return "-";
                    },
                  },
                  {
                    title: "Bukti",
                    dataIndex: "proof_url",
                    key: "proof_url",
                    render: (value) =>
                      value ? (
                        <Button href={value} target='_blank' rel='noreferrer'>
                          Lihat Bukti
                        </Button>
                      ) : (
                        "-"
                      ),
                  },
                ]}
              />
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={officer?.name ? 14 : 24}>
                <Card
                  variant='borderless'
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
                    height: "100%",
                  }}
                >
                  <Space vertical size={16} style={{ width: "100%" }}>
                    <Space align='center' size={10}>
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 14,
                          display: "grid",
                          placeItems: "center",
                          background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
                          color: "#0f766e",
                        }}
                      >
                        <FileSignature size={18} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>Petugas Keuangan</div>
                        <Text type='secondary'>
                          Nama dan tanda tangan resmi yang tercantum pada invoice.
                        </Text>
                      </div>
                    </Space>

                    {!officer?.name ? (
                      <Alert
                        type='info'
                        showIcon
                        message='Profil petugas invoice belum diisi'
                        description='Nama atau tanda tangan petugas keuangan belum tersedia pada pengaturan keuangan satuan.'
                      />
                    ) : (
                      <Flex
                        gap={20}
                        wrap='wrap'
                        justify='space-between'
                        align='start'
                      >
                        <div>
                          <Text type='secondary'>Nama Petugas</Text>
                          <div style={{ marginTop: 4, fontWeight: 700 }}>
                            {officer.name}
                          </div>
                        </div>
                        <div>
                          <Text type='secondary'>Tanda Tangan</Text>
                          <div style={{ marginTop: 8 }}>
                            {officer.signature_url ? (
                              <Image
                                src={officer.signature_url}
                                alt='Tanda tangan petugas'
                                width={isMobile ? 140 : 180}
                                style={{ objectFit: "contain" }}
                              />
                            ) : (
                              <Text type='secondary'>Belum diunggah</Text>
                            )}
                          </div>
                        </div>
                      </Flex>
                    )}
                  </Space>
                </Card>
              </Col>

              {officer?.name ? (
                <Col xs={24} xl={10}>
                  <Card
                    variant='borderless'
                    style={{
                      borderRadius: 24,
                      border: "1px solid rgba(148,163,184,0.14)",
                      boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
                      height: "100%",
                      background:
                        "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                    }}
                  >
                    <Space direction='vertical' size={10} style={{ width: "100%" }}>
                      <Text type='secondary'>Catatan Invoice</Text>
                      <Title level={5} style={{ margin: 0 }}>
                        Dokumen pembayaran resmi
                      </Title>
                      <Text type='secondary'>
                        Gunakan invoice ini sebagai referensi utama saat
                        memantau status pembayaran dan verifikasi transaksi.
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ) : null}
            </Row>
          </MotionDiv>
        </MotionDiv>
      )}
    </Modal>
  );
};

export default ParentInvoiceModal;
