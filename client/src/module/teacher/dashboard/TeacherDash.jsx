import React from "react";
import { AppLayout } from "../../../components";
import { useGetTeacherDashQuery } from "../../../service/main/ApiDash";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Space,
  Typography,
  Spin,
  Alert,
  Avatar,
} from "antd";
import { BookOpen, ClipboardList, Layers, CalendarCheck } from "lucide-react";

const { Title, Text } = Typography;

const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 8px 22px rgba(10, 24, 54, 0.08)",
  border: "1px solid #f0f0f0",
};

const iconStyle = (color) => ({ color, width: 20, height: 20 });

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const TeacherDash = () => {
  const { data, isLoading, isError } = useGetTeacherDashQuery();

  const stats = [
    {
      title: "Mata Pelajaran",
      value: data?.stats?.subjects || 0,
      icon: <BookOpen style={iconStyle("#1677ff")} />,
    },
    {
      title: "Bank Soal",
      value: data?.stats?.banks || 0,
      icon: <Layers style={iconStyle("#13c2c2")} />,
    },
    {
      title: "Ujian Aktif",
      value: data?.stats?.examsActive || 0,
      icon: <CalendarCheck style={iconStyle("#52c41a")} />,
    },
    {
      title: "Total Ujian",
      value: data?.stats?.examsTotal || 0,
      icon: <ClipboardList style={iconStyle("#fa8c16")} />,
    },
  ];

  const subjectColumns = [
    {
      title: "Mata Pelajaran",
      dataIndex: "name",
      key: "name",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {record.code || "Tanpa kode"}
          </div>
        </div>
      ),
    },
    {
      title: "Kelas",
      dataIndex: "class_count",
      key: "class_count",
      width: 90,
      render: (value) => value || 0,
    },
    {
      title: "Daftar Kelas",
      dataIndex: "classes",
      key: "classes",
      render: (value = []) =>
        value.length ? (
          <Space wrap size={[4, 4]}>
            {value.map((item) => (
              <Tag key={item.id}>{item.name}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Belum ada kelas</Text>
        ),
    },
  ];

  const bankColumns = [
    {
      title: "Judul Bank",
      dataIndex: "title",
      key: "title",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {record.subject_name || "Tanpa mapel"}
          </div>
        </div>
      ),
    },
    {
      title: "Tipe",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (value) => <Tag color="geekblue">{value || "-"}</Tag>,
    },
    {
      title: "Jumlah Soal",
      dataIndex: "question_count",
      key: "question_count",
      width: 110,
      render: (value) => value || 0,
    },
    {
      title: "Dibuat",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (value) => formatDate(value),
    },
  ];

  const examColumns = [
    {
      title: "Nama Ujian",
      dataIndex: "name",
      key: "name",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {record.subject_name || "Tanpa mapel"}
          </div>
        </div>
      ),
    },
    {
      title: "Kelas",
      dataIndex: "classes",
      key: "classes",
      render: (value = []) =>
        value.length ? (
          <Space wrap size={[4, 4]}>
            {value.map((item) => (
              <Tag key={item.id}>{item.name}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Belum ada kelas</Text>
        ),
    },
    {
      title: "Durasi",
      dataIndex: "duration_minutes",
      key: "duration_minutes",
      width: 90,
      render: (value) => `${value || 0} mnt`,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 90,
      render: (value) => (
        <Tag color={value ? "green" : "default"}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Dibuat",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (value) => formatDate(value),
    },
  ];

  if (isLoading) {
    return (
      <AppLayout title="Dashboard Guru">
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout title="Dashboard Guru">
        <Alert
          title="Gagal memuat data dashboard guru."
          type="error"
          showIcon
        />
      </AppLayout>
    );
  }

  const teacherName = data?.teacher?.full_name || "Guru";
  const teacherInitial = teacherName?.[0]?.toUpperCase() || "G";

  return (
    <AppLayout title="Dashboard Guru">
      <div style={{ padding: "0 8px" }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={16}>
            <Card style={cardStyle}>
              <Space align="center" size={16} style={{ width: "100%" }}>
                <Avatar
                  size={56}
                  src={data?.teacher?.img_url || undefined}
                  style={{
                    background: "#0f172a",
                    fontWeight: 600,
                  }}
                >
                  {teacherInitial}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {teacherName}
                  </Title>
                  <Text type="secondary">
                    {data?.homebase?.name || "Homebase"} ·{" "}
                    {data?.homebase?.level || "Satuan"}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      <Tag color="blue">NIP: {data?.teacher?.nip || "-"}</Tag>
                      <Tag color={data?.activePeriode ? "green" : "volcano"}>
                        {data?.activePeriode
                          ? `Periode Aktif: ${data.activePeriode.name}`
                          : "Belum ada periode aktif"}
                      </Tag>
                    </Space>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card style={cardStyle}>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text strong>Ringkasan Mengajar</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Statistik singkat aktivitas akademik Anda
                </Text>
                <Row gutter={[12, 12]} style={{ marginTop: 4 }}>
                  {stats.map((item) => (
                    <Col span={12} key={item.title}>
                      <Card
                        size="small"
                        style={{
                          borderRadius: 12,
                          border: "1px solid #f0f0f0",
                        }}
                      >
                        <Statistic
                          title={item.title}
                          value={item.value}
                          prefix={item.icon}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space align="center" size={8}>
                  <BookOpen style={iconStyle("#1677ff")} />
                  <span>Mata Pelajaran</span>
                </Space>
              }
              style={cardStyle}
            >
              <Table
                dataSource={data?.subjects || []}
                columns={subjectColumns}
                pagination={false}
                rowKey={(record) => record.id}
                size="small"
                locale={{ emptyText: "Belum ada data mata pelajaran" }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space align="center" size={8}>
                  <Layers style={iconStyle("#13c2c2")} />
                  <span>Bank Soal Terbaru</span>
                </Space>
              }
              style={cardStyle}
            >
              <Table
                dataSource={data?.banks || []}
                columns={bankColumns}
                pagination={false}
                rowKey={(record) => record.id}
                size="small"
                locale={{ emptyText: "Belum ada bank soal" }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              title={
                <Space align="center" size={8}>
                  <ClipboardList style={iconStyle("#fa8c16")} />
                  <span>Jadwal Ujian Terbaru</span>
                </Space>
              }
              style={cardStyle}
            >
              <Table
                dataSource={data?.exams || []}
                columns={examColumns}
                pagination={false}
                rowKey={(record) => record.id}
                size="small"
                locale={{ emptyText: "Belum ada jadwal ujian" }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </AppLayout>
  );
};

export default TeacherDash;
