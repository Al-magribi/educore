import React from "react";
import { useGetDashboardSummaryQuery } from "../../../service/main/ApiDash";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Spin,
  Alert,
  Typography,
  Progress,
  Space,
  Grid,
  List,
  Layout,
  Flex,
} from "antd";
import {
  School,
  UsersRound,
  UserCheck,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Building2,
  BookMarked,
  Activity,
} from "lucide-react";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Content } = Layout;

const cardStyle = {
  borderRadius: 22,
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
};

const actionTagColor = (action = "") => {
  const value = action.toLowerCase();
  if (value.includes("login")) return "green";
  if (value.includes("logout")) return "volcano";
  if (value.includes("update")) return "blue";
  if (value.includes("hapus") || value.includes("delete")) return "red";
  return "geekblue";
};

const summaryIconBox = (background, color, icon) => (
  <div
    style={{
      width: 42,
      height: 42,
      display: "grid",
      placeItems: "center",
      borderRadius: 14,
      background,
      color,
    }}
  >
    {icon}
  </div>
);

const AdminDash = () => {
  const { data, isLoading, isError } = useGetDashboardSummaryQuery();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const stats = [
    {
      title: "Siswa Aktif",
      value: data?.stats?.students || 0,
      icon: <UsersRound size={18} />,
      color: "#2563eb",
      bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
    },
    {
      title: "Guru Aktif",
      value: data?.stats?.teachers || 0,
      icon: <UserCheck size={18} />,
      color: "#16a34a",
      bg: "linear-gradient(135deg, #dcfce7, #ecfccb)",
    },
    {
      title: "Rombel",
      value: data?.stats?.classes || 0,
      icon: <GraduationCap size={18} />,
      color: "#7c3aed",
      bg: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
    },
    {
      title: "Mapel",
      value: data?.stats?.subjects || 0,
      icon: <BookOpen size={18} />,
      color: "#d97706",
      bg: "linear-gradient(135deg, #fef3c7, #ffedd5)",
    },
    {
      title: "Ujian Aktif",
      value: data?.stats?.activeExams || 0,
      icon: <ClipboardList size={18} />,
      color: "#0891b2",
      bg: "linear-gradient(135deg, #cffafe, #dbeafe)",
    },
  ];

  const insightCards = [
    {
      key: "majors",
      title: "Total Jurusan",
      value: data?.stats?.majors || 0,
      icon: <Building2 size={18} />,
      color: "#0f766e",
      bg: "linear-gradient(135deg, #ccfbf1, #dbeafe)",
    },
    {
      key: "classes",
      title: "Jumlah Kelas",
      value: data?.stats?.classes || 0,
      icon: <School size={18} />,
      color: "#1d4ed8",
      bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
    },
    {
      key: "subjects",
      title: "Aktivitas Mapel",
      value: data?.stats?.subjects || 0,
      icon: <BookMarked size={18} />,
      color: "#b45309",
      bg: "linear-gradient(135deg, #fef3c7, #fde68a)",
    },
  ];

  const logColumns = [
    {
      title: "Waktu",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => new Date(text).toLocaleString("id-ID"),
      width: 190,
      ellipsis: true,
    },
    {
      title: "User",
      dataIndex: "full_name",
      key: "full_name",
      render: (text) => <Text strong>{text}</Text>,
      ellipsis: true,
    },
    {
      title: "Aktivitas",
      dataIndex: "action",
      key: "action",
      render: (text) => <Tag color={actionTagColor(text)}>{text}</Tag>,
      width: 140,
      align: "center",
    },
  ];

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "60vh",
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: screens.md ? "24px" : "12px" }}>
        <Alert title='Gagal memuat data dashboard.' type='error' showIcon />
      </div>
    );
  }

  return (
    <div>
      <Card
        bordered={false}
        style={{
          marginBottom: 20,
          borderRadius: 24,
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #14b8a6 100%)",
        }}
        styles={{ body: { padding: screens.md ? 28 : 20 } }}
      >
        <Flex
          justify='space-between'
          align={screens.md ? "center" : "start"}
          vertical={!screens.md}
          gap={20}
        >
          <div>
            <Text style={{ color: "rgba(255,255,255,0.72)" }}>
              Dashboard / Admin
            </Text>
            <Title
              level={2}
              style={{ color: "#fff", margin: "8px 0 6px", fontSize: 34 }}
            >
              {data?.homebase?.name || "Dashboard Satuan"}
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 15 }}>
              Ringkasan operasional homebase, statistik inti, dan aktivitas
              sistem terbaru.
            </Text>
          </div>
          <div
            style={{
              width: 68,
              height: 68,
              display: "grid",
              placeItems: "center",
              borderRadius: 20,
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
            }}
          >
            <School size={28} />
          </div>
        </Flex>

        <Flex gap={10} wrap='wrap' style={{ marginTop: 20 }}>
          <Tag color='blue'>Level: {data?.homebase?.level || "Satuan"}</Tag>
          <Tag color={data?.activePeriode ? "green" : "volcano"}>
            {data?.activePeriode
              ? `Periode Aktif: ${data.activePeriode.name}`
              : "Belum ada periode aktif"}
          </Tag>
          <Tag color='geekblue'>Homebase ID: {data?.homebase?.id}</Tag>
        </Flex>
      </Card>

      <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
        {stats.map((item) => (
          <Card
            key={item.title}
            bordered={false}
            style={{
              flex: screens.xl
                ? "1 1 0"
                : screens.md
                  ? "1 1 calc(33.333% - 11px)"
                  : "1 1 100%",
              minWidth: screens.md ? 0 : "100%",
              borderRadius: 20,
              background: "rgba(255,255,255,0.88)",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: "18px 20px" } }}
          >
            <Flex justify='space-between' align='start'>
              <Statistic title={item.title} value={item.value} />
              {summaryIconBox(item.bg, item.color, item.icon)}
            </Flex>
          </Card>
        ))}
      </Flex>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card bordered={false} style={cardStyle}>
            <Space direction='vertical' size={18} style={{ width: "100%" }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Ringkasan Akademik
                </Title>
                <Text type='secondary'>
                  Snapshot cepat operasional homebase saat ini.
                </Text>
              </div>

              <Flex vertical gap={14}>
                {insightCards.map((item) => (
                  <Card
                    key={item.key}
                    bordered={false}
                    style={{
                      borderRadius: 18,
                      background: "#f8fafc",
                      boxShadow: "inset 0 0 0 1px rgba(148, 163, 184, 0.12)",
                    }}
                    styles={{ body: { padding: "16px 18px" } }}
                  >
                    <Flex justify='space-between' align='center'>
                      <div>
                        <Text type='secondary'>{item.title}</Text>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            lineHeight: 1.15,
                            marginTop: 4,
                            color: "#0f172a",
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                      {summaryIconBox(item.bg, item.color, item.icon)}
                    </Flex>
                  </Card>
                ))}
              </Flex>

              <Card
                bordered={false}
                style={{
                  borderRadius: 18,
                  background:
                    "linear-gradient(180deg, rgba(219,234,254,.6) 0%, rgba(255,255,255,.9) 100%)",
                }}
                styles={{ body: { padding: "18px 18px 16px" } }}
              >
                <Flex justify='space-between' align='center'>
                  <div>
                    <Text strong>Aktivitas Akademik</Text>
                    <div>
                      <Text type='secondary' style={{ fontSize: 13 }}>
                        Indikator sederhana berdasarkan total mapel aktif.
                      </Text>
                    </div>
                  </div>
                  <Activity size={18} color='#1d4ed8' />
                </Flex>
                <Progress
                  percent={
                    data?.stats?.subjects
                      ? Math.min(data.stats.subjects * 2, 100)
                      : 0
                  }
                  strokeColor={{
                    "0%": "#1d4ed8",
                    "100%": "#14b8a6",
                  }}
                  trailColor='rgba(148,163,184,0.18)'
                  style={{ marginTop: 14, marginBottom: 6 }}
                />
              </Card>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card
            bordered={false}
            style={cardStyle}
            title={
              <Flex align='center' gap={8}>
                <ClipboardList size={18} color='#1d4ed8' />
                <span>Aktivitas Sistem Terakhir</span>
              </Flex>
            }
            styles={{ body: { paddingTop: 8 } }}
          >
            {isMobile ? (
              <List
                dataSource={data?.logs || []}
                locale={{ emptyText: "Belum ada aktivitas terbaru" }}
                renderItem={(item) => (
                  <List.Item style={{ padding: "12px 4px" }}>
                    <Space
                      direction='vertical'
                      size={4}
                      style={{ width: "100%" }}
                    >
                      <Flex
                        align='center'
                        justify='space-between'
                        gap={8}
                        wrap='wrap'
                      >
                        <Text strong style={{ fontSize: 13 }}>
                          {item.full_name}
                        </Text>
                        <Tag
                          color={actionTagColor(item.action)}
                          style={{ marginInlineEnd: 0 }}
                        >
                          {item.action}
                        </Tag>
                      </Flex>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleString("id-ID")}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Table
                dataSource={data?.logs || []}
                columns={logColumns}
                pagination={false}
                rowKey={(record) => `${record.created_at}-${record.full_name}`}
                size='small'
                locale={{ emptyText: "Belum ada aktivitas terbaru" }}
                scroll={{ x: 520 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDash;
