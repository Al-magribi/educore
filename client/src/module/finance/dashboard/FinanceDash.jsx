import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";

import { LoadApp } from "../../../components";
import { useGetFinanceDashboardQuery } from "../../../service/finance/ApiDash";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const currency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const cardBaseStyle = {
  borderRadius: 28,
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 24px 60px rgba(15,23,42,0.07)",
  background: "rgba(255,255,255,0.9)",
};

const statusColorMap = {
  Lunas: "green",
  Cicilan: "gold",
  Penarikan: "orange",
  Setoran: "cyan",
  Pengeluaran: "red",
  Pemasukan: "blue",
};

const percentColor = (value) => {
  if (value >= 85) return "#15803d";
  if (value >= 65) return "#2563eb";
  if (value >= 45) return "#d97706";
  return "#dc2626";
};

const summaryIconMap = {
  revenue: <Banknote size={20} />,
  spp: <CreditCard size={20} />,
  savings: <PiggyBank size={20} />,
  cash: <Wallet size={20} />,
};

const summaryToneMap = {
  revenue: {
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #d1fae5)",
  },
  spp: { color: "#2563eb", bg: "linear-gradient(135deg, #dbeafe, #eff6ff)" },
  savings: {
    color: "#15803d",
    bg: "linear-gradient(135deg, #dcfce7, #f0fdf4)",
  },
  cash: { color: "#7c3aed", bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)" },
};

const FinanceDash = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data, isLoading, isFetching, error, refetch } =
    useGetFinanceDashboardQuery();

  if (isLoading && !data) {
    return <LoadApp />;
  }

  if (error && !data) {
    return (
      <Alert
        type='error'
        showIcon
        message='Dashboard keuangan gagal dimuat'
        description='Data dashboard tidak dapat diambil dari server.'
        action={
          <Button size='small' onClick={refetch}>
            Muat ulang
          </Button>
        }
      />
    );
  }

  const meta = data?.meta || {};
  const summary = data?.summary || {};
  const spp = data?.spp || {};
  const others = data?.others || {};
  const savings = data?.savings || {};
  const classCash = data?.class_cash || {};
  const channels = data?.channels || [];
  const priorities = data?.priorities || [];
  const recentTransactions = data?.recent_transactions || [];

  const summaryCards = [
    {
      key: "revenue",
      title: "Pendapatan Sekolah",
      value: summary.school_revenue,
      note: "SPP dan pembayaran lainnya pada periode aktif.",
    },
    {
      key: "spp",
      title: "SPP Terkumpul",
      value: summary.spp_collected,
      note: `${spp.paid_students_current_month || 0} siswa lunas ${meta.current_month_label || "bulan ini"}.`,
    },
    {
      key: "savings",
      title: "Saldo Tabungan",
      value: summary.savings_balance,
      note: `${savings.transaction_count || 0} transaksi tabungan.`,
    },
    {
      key: "cash",
      title: "Saldo Kas Kelas",
      value: summary.class_cash_balance,
      note: `${classCash.transaction_count || 0} transaksi kas kelas.`,
    },
  ];

  const transactionColumns = [
    {
      title: "Subjek",
      dataIndex: "subject",
      key: "subject",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {record.channel}
          </div>
        </div>
      ),
    },
    {
      title: "Metode",
      dataIndex: "method",
      key: "method",
      width: 120,
      render: (value) => <Text type='secondary'>{value || "-"}</Text>,
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      align: "right",
      render: (value) => (
        <Text
          strong
          style={{ color: Number(value) < 0 ? "#b91c1c" : "#15803d" }}
        >
          {Number(value) < 0
            ? `- ${currency(Math.abs(Number(value)))}`
            : currency(value)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (value) => (
        <Tag color={statusColorMap[value] || "default"}>{value}</Tag>
      ),
    },
    {
      title: "Waktu",
      dataIndex: "time",
      key: "time",
      width: 170,
      render: (value) => <Text type='secondary'>{formatDateTime(value)}</Text>,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100%",
        borderRadius: 16,
        padding: isMobile ? "4px 0 24px" : "10px 15px",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,.14), transparent 28%), radial-gradient(circle at top right, rgba(15,118,110,.12), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #f5f7fb 45%, #eef4f8 100%)",
      }}
    >
      <Space vertical size={18} style={{ width: "100%" }}>
        <Card
          variant='borderless'
          style={{
            ...cardBaseStyle,
            background:
              "linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #0f766e 100%)",
          }}
          styles={{ body: { padding: isMobile ? 22 : 28 } }}
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} xl={15}>
              <Space vertical size={14}>
                <Tag color='cyan'>Dashboard Admin Keuangan</Tag>
                <Title
                  level={2}
                  style={{ color: "#fff", margin: 0, lineHeight: 1.15 }}
                >
                  Ringkasan keuangan sekolah dalam satu tampilan.
                </Title>
                <Paragraph style={{ color: "rgba(255,255,255,.8)", margin: 0 }}>
                  Periode aktif: {meta.active_periode?.name || "-"}. Pantau
                  pemasukan SPP, pembayaran lainnya, tabungan siswa, dan kas
                  kelas secara terpisah agar kondisi keuangan sekolah lebih
                  jelas dan mudah dikendalikan.
                </Paragraph>
                <Flex wrap='wrap' gap={10}>
                  <Tag color='gold'>
                    Bulan berjalan: {meta.current_month_label || "-"}
                  </Tag>
                  <Tag color='lime'>
                    Collection rate SPP:{" "}
                    {spp.collection_rate_current_month || 0}%
                  </Tag>
                  <Tag color='geekblue'>
                    Piutang pembayaran lain: {currency(others.total_remaining)}
                  </Tag>
                </Flex>
              </Space>
            </Col>
            <Col xs={24} xl={9}>
              <Card
                variant='borderless'
                style={{
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.14)",
                }}
                styles={{ body: { padding: 20 } }}
              >
                <Space vertical size={14} style={{ width: "100%" }}>
                  <Statistic
                    title={
                      <span style={{ color: "rgba(255,255,255,.72)" }}>
                        Pendapatan sekolah
                      </span>
                    }
                    value={summary.school_revenue || 0}
                    formatter={(value) => (
                      <span style={{ color: "#fff" }}>{currency(value)}</span>
                    )}
                    prefix={<Landmark size={20} color='#fff' />}
                  />
                  <Flex justify='space-between'>
                    <Text style={{ color: "#fff" }}>Dana terkelola</Text>
                    <Text strong style={{ color: "#fff" }}>
                      {currency(summary.managed_funds)}
                    </Text>
                  </Flex>
                  <Flex justify='space-between'>
                    <Text style={{ color: "#fff" }}>Outstanding aktif</Text>
                    <Text strong style={{ color: "#fff" }}>
                      {currency(
                        Number(spp.outstanding_current_month || 0) +
                          Number(others.total_remaining || 0),
                      )}
                    </Text>
                  </Flex>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          {summaryCards.map((item) => {
            const tone = summaryToneMap[item.key];
            return (
              <Col xs={24} sm={12} xl={12} xxl={6} key={item.key}>
                <Card variant='borderless' style={cardBaseStyle}>
                  <Space vertical size={14} style={{ width: "100%" }}>
                    <Flex justify='space-between' align='start'>
                      <div>
                        <Text type='secondary'>{item.title}</Text>
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {currency(item.value)}
                        </div>
                      </div>
                      <Flex
                        align='center'
                        justify='center'
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 18,
                          background: tone.bg,
                          color: tone.color,
                        }}
                      >
                        {summaryIconMap[item.key]}
                      </Flex>
                    </Flex>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      {item.note}
                    </Text>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xxl={16}>
            <Card variant='borderless' style={cardBaseStyle}>
              <Space vertical size={18} style={{ width: "100%" }}>
                <Flex justify='space-between' align='center' wrap='wrap'>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Performa Kanal Keuangan
                    </Title>
                    <Text type='secondary'>
                      Kanal diambil dari data real transaksi dan saldo.
                    </Text>
                  </div>
                  <Tag color={isFetching ? "processing" : "success"}>
                    {isFetching ? "Memuat ulang" : "Sinkron"}
                  </Tag>
                </Flex>
                <Row gutter={[14, 14]}>
                  {channels.map((item) => (
                    <Col xs={24} md={12} key={item.key}>
                      <Card
                        size='small'
                        variant='borderless'
                        style={{
                          borderRadius: 22,
                          background: "#f8fafc",
                          boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.12)",
                        }}
                      >
                        <Space vertical size={12} style={{ width: "100%" }}>
                          <Flex justify='space-between' align='center'>
                            <div>
                              <Text strong>{item.label}</Text>
                              <div
                                style={{
                                  fontSize: 22,
                                  fontWeight: 700,
                                  marginTop: 4,
                                }}
                              >
                                {currency(item.amount)}
                              </div>
                            </div>
                            <Tag
                              color={item.progress >= 75 ? "green" : "orange"}
                            >
                              {item.progress || 0}%
                            </Tag>
                          </Flex>
                          <Progress
                            percent={item.progress || 0}
                            strokeColor={percentColor(item.progress || 0)}
                            showInfo={false}
                          />
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            {item.note}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xxl={8}>
            <Card variant='borderless' style={cardBaseStyle}>
              <Space vertical size={14} style={{ width: "100%" }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Cakupan Data
                  </Title>
                  <Text type='secondary'>
                    Populasi aktif yang ikut dihitung di dashboard.
                  </Text>
                </div>
                <Card
                  variant='borderless'
                  style={{ borderRadius: 22, background: "#f8fafc" }}
                >
                  <Space vertical size={10}>
                    <Flex align='center' gap={10}>
                      <Users size={18} color='#1d4ed8' />
                      <Text strong>Siswa Aktif</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>
                      {summary.total_students || 0}
                    </Title>
                    <Text type='secondary'>
                      {summary.total_classes || 0} kelas,{" "}
                      {summary.total_grades || 0} tingkat.
                    </Text>
                  </Space>
                </Card>
                <Card
                  variant='borderless'
                  style={{ borderRadius: 22, background: "#f8fafc" }}
                >
                  <Space vertical size={10}>
                    <Flex align='center' gap={10}>
                      <ReceiptText size={18} color='#15803d' />
                      <Text strong>Master Aktif</Text>
                    </Flex>
                    <Text>Tarif SPP: {summary.active_spp_tariffs || 0}</Text>
                    <Text>
                      Jenis pembayaran lain: {summary.active_other_types || 0}
                    </Text>
                    <Text>
                      SPP target {meta.current_month_label || "-"}:{" "}
                      {currency(spp.expected_current_month)}
                    </Text>
                  </Space>
                </Card>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xxl={15}>
            <Card
              variant='borderless'
              style={cardBaseStyle}
              title='Transaksi Terbaru'
              extra={<Tag color='blue'>{recentTransactions.length} item</Tag>}
              styles={{ body: { paddingTop: 8 } }}
            >
              <Table
                dataSource={recentTransactions}
                columns={transactionColumns}
                pagination={false}
                size='small'
                scroll={{ x: 720 }}
                locale={{
                  emptyText: <Empty description='Belum ada transaksi' />,
                }}
              />
            </Card>
          </Col>

          <Col xs={24} xxl={9}>
            <Card variant='borderless' style={cardBaseStyle}>
              <Space vertical size={18} style={{ width: "100%" }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Prioritas Penagihan
                  </Title>
                  <Text type='secondary'>
                    Ringkasan diambil dari SPP bulan berjalan dan sisa tagihan
                    pembayaran lain.
                  </Text>
                </div>
                <List
                  dataSource={priorities}
                  split={false}
                  locale={{
                    emptyText: <Empty description='Tidak ada prioritas' />,
                  }}
                  renderItem={(item) => (
                    <List.Item style={{ padding: 0, border: "none" }}>
                      <Card
                        variant='borderless'
                        style={{
                          width: "100%",
                          borderRadius: 20,
                          background: "#f8fafc",
                          boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.12)",
                        }}
                      >
                        <Flex justify='space-between' align='start' gap={16}>
                          <div>
                            <Text strong>{item.title}</Text>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: "#64748b",
                              }}
                            >
                              {item.subject}
                            </div>
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: 22,
                                fontWeight: 700,
                              }}
                            >
                              {currency(item.amount)}
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: "#64748b",
                              }}
                            >
                              {item.note}
                            </div>
                          </div>
                          <Tag
                            color={
                              item.status === "Terkendali" ? "green" : "orange"
                            }
                          >
                            {item.status}
                          </Tag>
                        </Flex>
                      </Card>
                    </List.Item>
                  )}
                />
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default FinanceDash;
