import React, { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  CalendarClock,
  NotebookPen,
  ShieldUser,
  Users,
} from "lucide-react";
import { useGetMusyrifSummaryQuery } from "../../../service/tahfiz/ApiDashboard";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const cardStyle = {
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
  height: "100%",
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const MusyrifDash = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [periodeId, setPeriodeId] = useState();
  const [studentSearch, setStudentSearch] = useState("");

  const queryArg = useMemo(
    () => ({
      periode_id: periodeId,
    }),
    [periodeId],
  );

  const { data, isLoading, isFetching, isError, error } =
    useGetMusyrifSummaryQuery(queryArg);

  const selectedPeriodeId =
    periodeId ?? data?.filters?.selected_periode_id ?? undefined;

  const periodeOptions = (data?.filters?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudentRows = useMemo(() => {
    const rows = data?.student_summary || [];
    if (!normalizedStudentSearch) return rows;

    return rows.filter((item) => {
      const fullName = String(item.full_name || "").toLowerCase();
      const nis = String(item.nis || "").toLowerCase();
      const halaqohName = String(item.halaqoh_name || "").toLowerCase();
      return (
        fullName.includes(normalizedStudentSearch) ||
        nis.includes(normalizedStudentSearch) ||
        halaqohName.includes(normalizedStudentSearch)
      );
    });
  }, [data?.student_summary, normalizedStudentSearch]);

  const statItems = [
    {
      key: "halaqoh",
      title: "Halaqoh Diampu",
      value: data?.overview?.total_halaqoh || 0,
      icon: <BookOpenCheck size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
      color: "#1d4ed8",
    },
    {
      key: "students",
      title: "Siswa Binaan",
      value: data?.overview?.total_students || 0,
      icon: <Users size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #d1fae5)",
      color: "#15803d",
    },
    {
      key: "setoran",
      title: "Total Setoran",
      value: data?.overview?.total_setoran || 0,
      icon: <NotebookPen size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #fde68a)",
      color: "#b45309",
    },
    {
      key: "lines",
      title: "Total Baris",
      value: data?.overview?.total_lines || 0,
      icon: <CalendarClock size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
      color: "#6d28d9",
    },
  ];

  const activityColumns = [
    {
      title: "Jenis Aktivitas",
      dataIndex: "activity_type",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Setoran",
      dataIndex: "total_setoran",
      width: 130,
      align: "right",
      render: (value) => <Tag color='blue'>{value}</Tag>,
    },
    {
      title: "Baris",
      dataIndex: "total_lines",
      width: 130,
      align: "right",
      render: (value) => <Tag color='green'>{value}</Tag>,
    },
  ];

  const studentColumns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{record.full_name}</Text>
          <Text type='secondary'>NIS: {record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Kelas",
      dataIndex: "class_name",
      width: 140,
      render: (value) => value || "-",
    },
    {
      title: "Halaqoh",
      dataIndex: "halaqoh_name",
      width: 180,
      render: (value) => <Tag color='cyan'>{value || "-"}</Tag>,
    },
    {
      title: "Setoran",
      dataIndex: "total_setoran",
      width: 110,
      align: "right",
    },
    {
      title: "Baris",
      dataIndex: "total_lines",
      width: 110,
      align: "right",
    },
    {
      title: "Terakhir",
      dataIndex: "last_setoran_date",
      width: 140,
      render: (value) => formatDate(value),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat dashboard musyrif.'
        description={error?.data?.message || "Silakan coba lagi."}
      />
    );
  }

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          style={{
            ...cardStyle,
            overflow: "hidden",
            background:
              "radial-gradient(circle at top left, rgba(186,230,253,0.28), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0ea5e9 100%)",
            border: "none",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={16}
          >
            <Space direction='vertical' size={10}>
              <Flex
                align='center'
                gap={8}
                style={{
                  width: "fit-content",
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "#eff6ff",
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}
              >
                <ShieldUser size={16} />
                <span>DASHBOARD MUSYRIF</span>
              </Flex>

              <div>
                <Title
                  level={isMobile ? 3 : 2}
                  style={{ margin: 0, color: "#f8fafc" }}
                >
                  {data?.musyrif?.full_name || "Musyrif"}
                </Title>
                <Text style={{ color: "rgba(239,246,255,0.88)" }}>
                  Pantau halaqoh, setoran, dan progres siswa binaan dalam satu
                  panel kerja harian.
                </Text>
              </div>

              <Space wrap>
                <Tag color='cyan'>{data?.musyrif?.homebase_name || "-"}</Tag>
                <Tag
                  color={
                    data?.filters?.active_periode_id ===
                    data?.filters?.selected_periode_id
                      ? "green"
                      : "default"
                  }
                >
                  {data?.filters?.active_periode_id ===
                  data?.filters?.selected_periode_id
                    ? "Periode aktif"
                    : "Periode arsip"}
                </Tag>
              </Space>
            </Space>

            <Card
              variant='borderless'
              style={{
                minWidth: isMobile ? "100%" : 280,
                borderRadius: 18,
                background: "rgba(15, 23, 42, 0.18)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Space direction='vertical' size={10} style={{ width: "100%" }}>
                <Text strong style={{ color: "#e0f2fe" }}>
                  Filter Periode
                </Text>
                <Select
                  value={selectedPeriodeId}
                  options={periodeOptions}
                  onChange={setPeriodeId}
                  placeholder='Pilih periode'
                  loading={isFetching}
                  style={{ width: "100%" }}
                />
              </Space>
            </Card>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[14, 14]}>
          {statItems.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.key}>
              <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
                <Space
                  align='start'
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Space direction='vertical' size={4}>
                    <Text type='secondary'>{item.title}</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {item.value}
                    </Title>
                  </Space>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: item.bg,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={10}>
            <Card
              style={cardStyle}
              title='Halaqoh Binaan'
              styles={{ body: { padding: isMobile ? 14 : 18 } }}
            >
              {data?.halaqoh_summary?.length ? (
                <Space direction='vertical' size={12} style={{ width: "100%" }}>
                  {data.halaqoh_summary.map((item) => (
                    <Card
                      key={item.id}
                      size='small'
                      style={{
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                        border: "1px solid #dbeafe",
                      }}
                    >
                      <Flex justify='space-between' align='center' gap={12}>
                        <Space direction='vertical' size={2}>
                          <Text strong>{item.name}</Text>
                          <Text type='secondary'>
                            {Number(item.student_count || 0)} siswa
                          </Text>
                        </Space>
                        <Badge
                          color={item.is_active ? "#22c55e" : "#94a3b8"}
                          text={item.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </Flex>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Empty description='Belum ada halaqoh pada periode ini' />
              )}
            </Card>
          </Col>

          <Col xs={24} xl={14}>
            <Card
              style={cardStyle}
              title='Ringkasan Aktivitas'
              styles={{ body: { padding: isMobile ? 12 : 16 } }}
            >
              <Table
                rowKey={(record) => record.activity_type}
                columns={activityColumns}
                dataSource={data?.activity_summary || []}
                pagination={false}
                loading={isFetching}
                scroll={{ x: 520 }}
                locale={{
                  emptyText: "Belum ada aktivitas setoran pada periode ini",
                }}
              />
            </Card>
          </Col>
        </Row>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Card
          style={cardStyle}
          title='Rekap Siswa Binaan'
          styles={{ body: { padding: isMobile ? 12 : 16 } }}
        >
          <Space direction='vertical' size={14} style={{ width: "100%" }}>
            <Flex
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              vertical={isMobile}
              gap={10}
            >
              <Text type='secondary'>
                Urutan siswa diambil dari aktivitas setoran terbanyak pada
                periode yang dipilih.
              </Text>
              <Input.Search
                allowClear
                placeholder='Cari siswa, NIS, atau halaqoh'
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                style={{ maxWidth: isMobile ? "100%" : 320 }}
              />
            </Flex>

            <Table
              rowKey='student_id'
              columns={studentColumns}
              dataSource={filteredStudentRows}
              loading={isFetching}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 920 }}
              locale={{
                emptyText: <Empty description='Belum ada data siswa' />,
              }}
            />
          </Space>
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default MusyrifDash;
