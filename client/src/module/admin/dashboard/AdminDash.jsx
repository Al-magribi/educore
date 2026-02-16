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
} from "antd";
import {
  School,
  UsersRound,
  UserCheck,
  GraduationCap,
  BookOpen,
  ClipboardList,
} from "lucide-react";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 8px 22px rgba(10, 24, 54, 0.08)",
  border: "1px solid #f0f0f0",
};

const iconStyle = (color) => ({ color, width: 20, height: 20 });

const sectionTitleStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#0f172a",
  marginBottom: 8,
};

const sectionHintStyle = {
  fontSize: 12,
  color: "#64748b",
};

const actionTagColor = (action = "") => {
  const value = action.toLowerCase();
  if (value.includes("login")) return "green";
  if (value.includes("logout")) return "volcano";
  if (value.includes("update")) return "blue";
  if (value.includes("hapus") || value.includes("delete")) return "red";
  return "geekblue";
};

const AdminDash = () => {
  const { data, isLoading, isError } = useGetDashboardSummaryQuery();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const stats = [
    {
      title: "Siswa Aktif",
      value: data?.stats?.students || 0,
      icon: <UsersRound style={iconStyle("#1677ff")} />,
    },
    {
      title: "Guru Aktif",
      value: data?.stats?.teachers || 0,
      icon: <UserCheck style={iconStyle("#52c41a")} />,
    },
    {
      title: "Rombel",
      value: data?.stats?.classes || 0,
      icon: <GraduationCap style={iconStyle("#722ed1")} />,
    },
    {
      title: "Mapel",
      value: data?.stats?.subjects || 0,
      icon: <BookOpen style={iconStyle("#fa8c16")} />,
    },
    {
      title: "Ujian Aktif",
      value: data?.stats?.activeExams || 0,
      icon: <ClipboardList style={iconStyle("#13c2c2")} />,
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
      width: 120,
      align: "center",
    },
  ];

  if (isLoading) {
    return (
      <>
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Alert message="Gagal memuat data dashboard." type="error" showIcon />
      </>
    );
  }

  return (
    <>
      <div style={{ padding: "0 8px" }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={16}>
            <Card
              style={{
                ...cardStyle,
                background:
                  "linear-gradient(135deg, #eef5ff 0%, #ffffff 60%)",
              }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space align="center" size={12}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "#e6f4ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <School style={iconStyle("#1677ff")} />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {data?.homebase?.name || "Dashboard Satuan"}
                    </Title>
                    <Text type="secondary">
                      Ringkasan operasional berdasarkan homebase Anda
                    </Text>
                  </div>
                </Space>
                <Space wrap>
                  <Tag color="blue">
                    Level: {data?.homebase?.level || "Satuan"}
                  </Tag>
                  <Tag color={data?.activePeriode ? "green" : "volcano"}>
                    {data?.activePeriode
                      ? `Periode Aktif: ${data.activePeriode.name}`
                      : "Belum ada periode aktif"}
                  </Tag>
                  <Tag color="geekblue">Homebase ID: {data?.homebase?.id}</Tag>
                </Space>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card style={cardStyle}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <div style={sectionTitleStyle}>Ringkasan Akademik</div>
                <Text style={sectionHintStyle}>
                  Snapshot operasional hari ini
                </Text>
                <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Text type="secondary">Total Jurusan</Text>
                    <div>
                      <Text strong style={{ fontSize: 18 }}>
                        {data?.stats?.majors || 0}
                      </Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Jumlah Kelas</Text>
                    <div>
                      <Text strong style={{ fontSize: 18 }}>
                        {data?.stats?.classes || 0}
                      </Text>
                    </div>
                  </Col>
                </Row>
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary">Aktivitas Akademik</Text>
                  <Progress
                    percent={
                      data?.stats?.subjects
                        ? Math.min(data.stats.subjects * 2, 100)
                        : 0
                    }
                    showInfo={false}
                    strokeColor="#1677ff"
                  />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <div style={{ marginBottom: 12 }}>
          <div style={sectionTitleStyle}>Statistik Inti</div>
          <Text style={sectionHintStyle}>
            Ikhtisar data utama pada homebase Anda
          </Text>
        </div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {stats.map((item) => (
            <Col key={item.title} xs={24} sm={12} md={8} xl={4}>
              <Card style={cardStyle}>
                <Statistic
                  title={item.title}
                  value={item.value}
                  prefix={item.icon}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={24}>
            <Card
              title={
                <Space align="center" size={8}>
                  <ClipboardList style={iconStyle("#1677ff")} />
                  <span>Aktivitas Sistem Terakhir</span>
                </Space>
              }
              style={cardStyle}
              styles={{ body: { paddingTop: 8 } }}
            >
              {isMobile ? (
                <List
                  dataSource={data?.logs || []}
                  locale={{ emptyText: "Belum ada aktivitas terbaru" }}
                  renderItem={(item) => (
                    <List.Item style={{ padding: "10px 4px" }}>
                      <Space
                        direction="vertical"
                        size={2}
                        style={{ width: "100%" }}
                      >
                        <Space
                          align="center"
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text strong style={{ fontSize: 13 }}>
                            {item.full_name}
                          </Text>
                          <Tag color={actionTagColor(item.action)} style={{ marginInlineEnd: 0 }}>
                            {item.action}
                          </Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
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
                  size="small"
                  locale={{ emptyText: "Belum ada aktivitas terbaru" }}
                  scroll={{ x: 520 }}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default AdminDash;

