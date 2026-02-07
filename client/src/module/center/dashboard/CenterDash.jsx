import React from "react";
import { AppLayout } from "../../../components";
import { useGetDashboardSummaryQuery } from "../../../service/center/ApiCenterDash";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Spin,
  Alert,
  List,
  Typography,
  Progress,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const CenterDash = () => {
  const { data, isLoading, isError } = useGetDashboardSummaryQuery();

  // Helper untuk icon kartu statistik
  const cardStyle = { borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" };

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Dashboard">
        <Alert message="Gagal memuat data" type="error" showIcon />
      </AppLayout>
    );
  }

  // Menyiapkan data untuk Grafik Kehadiran sederhana
  const totalAttendance =
    data?.attendance.reduce((acc, curr) => acc + parseInt(curr.count), 0) || 0;

  // Kolom untuk Tabel Log Aktivitas
  const logColumns = [
    {
      title: "Waktu",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => new Date(text).toLocaleString("id-ID"),
    },
    {
      title: "User",
      dataIndex: "full_name",
      key: "full_name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Aktivitas",
      dataIndex: "action",
      key: "action",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
  ];

  return (
    <AppLayout title={"Dashboard Center"}>
      <div style={{ padding: "0 10px" }}>
        {/* SECTION 1: STATISTIC CARDS */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={cardStyle}>
              <Statistic
                title="Total Siswa"
                value={data?.stats?.students || 0}
                prefix={<UserOutlined style={{ color: "#1890ff" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={cardStyle}>
              <Statistic
                title="Total Guru"
                value={data?.stats?.teachers || 0}
                prefix={<TeamOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={cardStyle}>
              <Statistic
                title="Ujian Aktif (CBT)"
                value={data?.stats?.activeExams || 0}
                prefix={<ReadOutlined style={{ color: "#faad14" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={cardStyle}>
              <Statistic
                title="Setoran Tahfiz (Hari Ini)"
                value={data?.stats?.tahfizToday || 0}
                prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* SECTION 2: CONTENT (ATTENDANCE & LOGS) */}
        <Row gutter={[24, 24]}>
          {/* LEFT: ATTENDANCE SUMMARY */}
          <Col xs={24} lg={10}>
            <Card title="Kehadiran Hari Ini" style={cardStyle}>
              {data?.attendance?.length > 0 ? (
                data.attendance.map((item, index) => {
                  const percent =
                    totalAttendance > 0
                      ? (
                          (parseInt(item.count) / totalAttendance) *
                          100
                        ).toFixed(1)
                      : 0;

                  // Warna berdasarkan status
                  let color = "#1890ff";
                  if (item.status === "Sakit") color = "#faad14";
                  if (item.status === "Izin") color = "#13c2c2";
                  if (item.status === "Alpha") color = "#ff4d4f";

                  return (
                    <div key={index} style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text>{item.status}</Text>
                        <Text strong>{item.count} Siswa</Text>
                      </div>
                      <Progress
                        percent={percent}
                        strokeColor={color}
                        size="small"
                      />
                    </div>
                  );
                })
              ) : (
                <Alert
                  title="Belum ada data presensi hari ini"
                  type="info"
                  showIcon
                />
              )}
            </Card>
          </Col>

          {/* RIGHT: RECENT ACTIVITY LOGS */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <span>
                  <FieldTimeOutlined /> Aktivitas Sistem Terakhir
                </span>
              }
              style={cardStyle}
            >
              <Table
                dataSource={data?.logs || []}
                columns={logColumns}
                pagination={false}
                rowKey="created_at"
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </AppLayout>
  );
};

export default CenterDash;
