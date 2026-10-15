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
  ArrowLeft,
  CalendarClock,
  FileSignature,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import {
  currencyFormatter,
  dateFormatter,
  statusMetaMap,
} from "../../../parent/transaction/components/parentTransactionShared";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

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

const TransactionInvoicePanel = ({
  invoiceId,
  invoiceData,
  loading,
  onClose,
}) => {
  const screens = Grid.useBreakpoint();
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
      icon: <ReceiptText size={18} />,
      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
      color: "#c2410c",
    },
  ];

  const itemDesktopColumns = [
    {
      title: "Item",
      dataIndex: "description",
      key: "description",
      render: (_, record) => (
        <Space vertical size={0}>
          <Text strong style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
            {record.description}
          </Text>
          <Text type='secondary'>
            {record.billing_period_label || record.component_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Nominal",
      dataIndex: "amount_due",
      key: "amount_due",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Dibayar",
      dataIndex: "paid_amount",
      key: "paid_amount",
      render: (value) => currencyFormatter.format(Number(value || 0)),
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
            style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
          >
            {meta.label}
          </Tag>
        );
      },
    },
  ];

  const itemMobileColumns = [
    {
      title: "Item",
      key: "item",
      render: (_, record) => {
        const meta = statusMetaMap[record.status] || statusMetaMap.unpaid;
        return (
          <Flex vertical gap={8} style={{ width: "100%" }}>
            <Flex justify='space-between' align='flex-start' gap={8}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text strong style={{ display: "block", wordBreak: "break-word" }}>
                  {record.description}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {record.billing_period_label || record.component_name || "-"}
                </Text>
              </div>
              <Tag
                color={meta.color}
                style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
              >
                {meta.label}
              </Tag>
            </Flex>
            <Flex justify='space-between' gap={8}>
              <div>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  Nominal
                </Text>
                <Text strong style={{ fontSize: 13 }}>
                  {currencyFormatter.format(Number(record.amount_due || 0))}
                </Text>
              </div>
              <div>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  Dibayar
                </Text>
                <Text strong style={{ fontSize: 13 }}>
                  {currencyFormatter.format(Number(record.paid_amount || 0))}
                </Text>
              </div>
            </Flex>
          </Flex>
        );
      },
    },
  ];

  const paymentDesktopColumns = [
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
      render: (value) => currencyFormatter.format(Number(value || 0)),
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
            style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
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
  ];

  const paymentMobileColumns = [
    {
      title: "Pembayaran",
      key: "payment",
      render: (_, record) => {
        const meta = statusMetaMap[record.status] || statusMetaMap.unpaid;
        return (
          <Flex vertical gap={8} style={{ width: "100%" }}>
            <Flex justify='space-between' align='flex-start' gap={8}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text strong style={{ display: "block" }}>
                  {dateFormatter(record.payment_date, true)}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {record.payment_channel || "-"}
                </Text>
              </div>
              <Tag
                color={meta.color}
                style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
              >
                {meta.label}
              </Tag>
            </Flex>
            <Flex justify='space-between' align='center' gap={8} wrap='wrap'>
              <div>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  Alokasi
                </Text>
                <Text strong style={{ fontSize: 13 }}>
                  {currencyFormatter.format(Number(record.allocated_amount || 0))}
                </Text>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  Ref: {record.reference_no || "-"}
                </Text>
              </div>
              {record.proof_url ? (
                <Button
                  size='small'
                  href={record.proof_url}
                  target='_blank'
                  rel='noreferrer'
                >
                  Bukti
                </Button>
              ) : null}
            </Flex>
          </Flex>
        );
      },
    },
  ];

  return (
    <Card
      variant='borderless'
      style={{
        borderRadius: isMobile ? 20 : 30,
        border: "1px solid rgba(148,163,184,0.14)",
        boxShadow: "0 24px 56px rgba(15,23,42,0.08)",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        overflow: "hidden",
      }}
      styles={{ body: { padding: isMobile ? 12 : 20 } }}
    >
      {loading ? (
        <div style={{ padding: "56px 0", textAlign: "center" }}>
          <Spin size='large' />
        </div>
      ) : !invoiceId || !invoice ? (
        <Empty description='Invoice belum dipilih' />
      ) : (
        <MotionDiv
          initial='hidden'
          animate='show'
          variants={containerVariants}
          style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 18 }}
        >
          <MotionDiv variants={itemVariants}>
            <Card
              variant='borderless'
              style={{
                borderRadius: isMobile ? 18 : 24,
                overflow: "hidden",
                background:
                  "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)",
                boxShadow: "0 24px 56px rgba(15,23,42,0.18)",
              }}
              styles={{ body: { padding: isMobile ? 14 : 20 } }}
            >
              <Flex
                justify='space-between'
                align='start'
                gap={16}
                wrap='wrap'
                vertical={isMobile}
              >
                <Space vertical size={10} style={{ maxWidth: 640, width: "100%" }}>
                  <Button
                    icon={<ArrowLeft size={16} />}
                    onClick={onClose}
                    block={isMobile}
                    style={{
                      width: isMobile ? "100%" : "fit-content",
                      borderRadius: 999,
                    }}
                  >
                    {isMobile ? "Kembali" : "Kembali ke daftar transaksi"}
                  </Button>

                  <Flex align='center' gap={8} wrap='wrap'>
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
                  </Flex>

                  <Space vertical size={2}>
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      {invoice.invoice_no}
                    </Text>
                    <Title
                      level={isMobile ? 4 : 3}
                      style={{ margin: 0, color: "#fff", lineHeight: 1.16 }}
                    >
                      Invoice {invoice.student_name}
                    </Title>
                  </Space>

                  {!isMobile ? (
                    <Paragraph
                      style={{
                        marginBottom: 0,
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 14,
                        maxWidth: 640,
                      }}
                    >
                      Ringkasan invoice, item pembayaran, dan histori alokasi dana
                      untuk transaksi terpilih.
                    </Paragraph>
                  ) : null}

                  <Flex align='center' gap={16} wrap='wrap'>
                    <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: isMobile ? 12 : 14 }}>
                      Tanggal: {dateFormatter(invoice.issue_date)}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: isMobile ? 12 : 14 }}>
                      Periode: {invoice.periode_name || "-"}
                    </Text>
                  </Flex>
                </Space>

                <Card
                  variant='borderless'
                  style={{
                    width: isMobile ? "100%" : 280,
                    maxWidth: "100%",
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(10px)",
                  }}
                  styles={{ body: { padding: isMobile ? 14 : 18 } }}
                >
                  <Space vertical size={10} style={{ width: "100%" }}>
                    <Flex align='center' gap={8}>
                      <CalendarClock size={16} color='#bfdbfe' />
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                        Ringkasan invoice
                      </Text>
                    </Flex>
                    <Title level={4} style={{ margin: 0, color: "#fff", wordBreak: "break-word" }}>
                      {currencyFormatter.format(Number(invoice.total_due || 0))}
                    </Title>
                    <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: isMobile ? 12 : 14 }}>
                      Sudah dibayar:{" "}
                      {currencyFormatter.format(Number(invoice.total_paid || 0))}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: isMobile ? 12 : 14 }}>
                      Sisa tagihan:{" "}
                      {currencyFormatter.format(
                        Math.max(
                          Number(invoice.total_due || 0) -
                            Number(invoice.total_paid || 0),
                          0,
                        ),
                      )}
                    </Text>
                  </Space>
                </Card>
              </Flex>
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: isMobile ? 10 : 16,
              }}
            >
              {summaryItems.map((item) => (
                <Card
                  key={item.key}
                  variant='borderless'
                  style={{
                    ...summaryCardStyle,
                    borderRadius: isMobile ? 16 : 22,
                  }}
                  styles={{ body: { padding: isMobile ? 14 : 20 } }}
                >
                  <Flex align='center' gap={12}>
                    <div
                      style={{
                        width: isMobile ? 40 : 44,
                        height: isMobile ? 40 : 44,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        background: item.background,
                        color: item.color,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                        {item.label}
                      </Text>
                      <Title
                        level={isMobile ? 5 : 4}
                        style={{ margin: "4px 0", wordBreak: "break-word" }}
                      >
                        {item.value}
                      </Title>
                      {!isMobile ? (
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {item.note}
                        </Text>
                      ) : null}
                    </div>
                  </Flex>
                </Card>
              ))}
            </div>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Card
              variant='borderless'
              style={{
                borderRadius: isMobile ? 16 : 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
              }}
              styles={{ body: { padding: isMobile ? 12 : 20 } }}
            >
              <Descriptions
                bordered
                size={isMobile ? "small" : "default"}
                column={{ xs: 1, md: 2 }}
                labelStyle={{ fontWeight: 700, width: isMobile ? 120 : 170 }}
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
                borderRadius: isMobile ? 16 : 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
                overflow: "hidden",
              }}
              styles={{ body: { padding: isMobile ? 8 : 0 } }}
            >
              <Table
                rowKey='id'
                dataSource={items}
                pagination={false}
                size={isMobile ? "small" : "middle"}
                scroll={isMobile ? undefined : { x: 720 }}
                columns={isMobile ? itemMobileColumns : itemDesktopColumns}
                locale={{
                  emptyText: "Belum ada item pembayaran pada invoice ini.",
                }}
              />
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Card
              title='Riwayat Pembayaran'
              variant='borderless'
              style={{
                borderRadius: isMobile ? 16 : 24,
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
                overflow: "hidden",
              }}
              styles={{ body: { padding: isMobile ? 8 : 0 } }}
            >
              <Table
                rowKey='id'
                dataSource={payments}
                pagination={false}
                size={isMobile ? "small" : "middle"}
                scroll={isMobile ? undefined : { x: 980 }}
                columns={isMobile ? paymentMobileColumns : paymentDesktopColumns}
                locale={{ emptyText: "Belum ada pembayaran yang masuk." }}
              />
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={officer?.name ? 14 : 24}>
                <Card
                  variant='borderless'
                  style={{
                    borderRadius: isMobile ? 16 : 24,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
                    height: "100%",
                  }}
                  styles={{ body: { padding: isMobile ? 14 : 24 } }}
                >
                  <Space vertical size={16} style={{ width: "100%" }}>
                    <Space align='start' size={10}>
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 14,
                          display: "grid",
                          placeItems: "center",
                          background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
                          color: "#0f766e",
                          flexShrink: 0,
                        }}
                      >
                        <FileSignature size={18} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>Petugas Keuangan</div>
                        <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
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
                        vertical={isMobile}
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
                                style={{ objectFit: "contain", maxWidth: "100%" }}
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
            </Row>
          </MotionDiv>
        </MotionDiv>
      )}
    </Card>
  );
};

export default TransactionInvoicePanel;
