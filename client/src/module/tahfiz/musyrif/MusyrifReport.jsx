import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from "antd";
import { motion } from "framer-motion";
import {
  ChartNoAxesColumn,
  BookOpenCheck,
  CheckCircle2,
  CircleGauge,
  GraduationCap,
  Users,
} from "lucide-react";
import { useGetMusyrifReportSummaryQuery } from "../../../service/tahfiz/ApiReport";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const toPercent = (value) => Number(value || 0);

const renderPercent = (value) => {
  const numericValue = toPercent(value);
  if (numericValue >= 100) return "100%";
  return `${numericValue.toFixed(2).replace(/\.00$/, "")}%`;
};

const getProgressStatus = (value) => {
  const numericValue = toPercent(value);
  if (numericValue >= 100) return "success";
  if (numericValue >= 70) return "active";
  return "exception";
};

const targetItemLabel = (item) => {
  if (item.target_type === "juz") return `Juz ${item.juz_number ?? "-"}`;

  if (item.start_ayat && item.end_ayat) {
    return `${item.surah_number}. ${item.surah_name_latin} (${item.start_ayat}-${item.end_ayat})`;
  }

  return `${item.surah_number}. ${item.surah_name_latin}`;
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const MusyrifReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  const [periodeId, setPeriodeId] = useState();
  const [halaqohId, setHalaqohId] = useState();
  const [studentSearch, setStudentSearch] = useState("");

  const { data, isLoading, isFetching, isError, error } =
    useGetMusyrifReportSummaryQuery({
      periode_id: periodeId,
      halaqoh_id: halaqohId,
    });

  const selectedPeriodeId =
    periodeId ?? data?.filters?.selected_periode_id ?? undefined;
  const selectedHalaqohId =
    halaqohId ?? data?.filters?.selected_halaqoh_id ?? undefined;

  const periodeOptions = (data?.filters?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));
  const halaqohOptions = (data?.filters?.halaqoh || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const overview = data?.overview || {};
  const plans = data?.plans || [];
  const studentRows = data?.student_rows || [];

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudentRows = useMemo(() => {
    if (!normalizedStudentSearch) return studentRows;
    return studentRows.filter((item) => {
      const name = String(item.student_name || "").toLowerCase();
      const nis = String(item.nis || "").toLowerCase();
      const className = String(item.class_name || "").toLowerCase();
      return (
        name.includes(normalizedStudentSearch) ||
        nis.includes(normalizedStudentSearch) ||
        className.includes(normalizedStudentSearch)
      );
    });
  }, [studentRows, normalizedStudentSearch]);

  const summaryCards = [
    {
      key: "students",
      title: "Siswa Terpetakan",
      value: overview.total_students || 0,
      icon: <Users size={18} />,
      bg: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
      color: "#0369a1",
    },
    {
      key: "plans",
      title: "Target Aktif",
      value: overview.active_plan_count || 0,
      icon: <BookOpenCheck size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #d1fae5)",
      color: "#15803d",
    },
    {
      key: "average",
      title: "Rata-rata Capaian",
      value: renderPercent(overview.average_completion_percentage || 0),
      icon: <CircleGauge size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #fde68a)",
      color: "#b45309",
    },
    {
      key: "completed",
      title: "Siswa Tuntas",
      value: overview.completed_students || 0,
      icon: <CheckCircle2 size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
      color: "#6d28d9",
    },
  ];

  const studentColumns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>NIS: {record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Kelas",
      key: "class",
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text>{record.class_name || "-"}</Text>
          <Text type='secondary'>{record.grade_name || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Target",
      key: "target",
      width: 180,
      render: (_, record) => (
        <Text>
          {record.achieved_ayahs} / {record.target_total_ayahs} ayat
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_completed",
      width: 120,
      render: (value) => (
        <Tag color={value ? "green" : "blue"}>{value ? "Tuntas" : "Proses"}</Tag>
      ),
    },
    {
      title: "Capaian",
      dataIndex: "completion_percentage",
      width: 240,
      render: (value) => (
        <Progress
          percent={toPercent(value)}
          status={getProgressStatus(value)}
          size='small'
          format={() => renderPercent(value)}
        />
      ),
    },
  ];

  const targetTabContent = (
    <Card
      title='Target Aktif yang Digunakan'
      bordered={false}
      styles={{ body: { padding: isMobile ? 8 : 10 } }}
    >
      {isLoading ? (
        <Card loading bordered={false} />
      ) : plans.length ? (
        <Space size={[8, 10]} wrap>
          {plans.map((plan) => (
            <Card
              key={plan.plan_id}
              size='small'
              style={{
                minWidth: isMobile ? "100%" : 280,
                borderRadius: 16,
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                border: "1px solid #dbeafe",
              }}
            >
              <Space direction='vertical' size={8} style={{ width: "100%" }}>
                <div>
                  <Text strong>{plan.title || `Target ${plan.grade_name}`}</Text>
                  <br />
                  <Text type='secondary'>{plan.grade_name}</Text>
                </div>
                <Badge
                  color='#2563eb'
                  text={`${plan.target_total_ayahs || 0} ayat target`}
                />
                <Space size={[6, 6]} wrap>
                  {(plan.items || []).map((item) => (
                    <Tag
                      key={item.id}
                      color={item.target_type === "juz" ? "gold" : "blue"}
                    >
                      {targetItemLabel(item)}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      ) : (
        <Empty description='Belum ada target aktif untuk filter ini' />
      )}
    </Card>
  );

  const reportTabContent = (
    <Card
      title='Rekap Capaian Siswa'
      bordered={false}
      styles={{ body: { padding: isMobile ? 8 : 10 } }}
    >
      <Space direction='vertical' size={14} style={{ width: "100%" }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={10}>
          <Text type='secondary'>
            Data capaian dihitung berdasarkan setoran ziyadah pada halaqoh
            musyrif yang dipilih.
          </Text>
          <Input.Search
            allowClear
            placeholder='Cari nama siswa'
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            style={{ maxWidth: 320 }}
          />
        </Flex>
        <Table
          rowKey='student_id'
          columns={studentColumns}
          dataSource={filteredStudentRows}
          loading={isLoading || isFetching}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 980 }}
          locale={{ emptyText: <Empty description='Belum ada data siswa' /> }}
        />
      </Space>
    </Card>
  );

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat laporan musyrif.'
        description={error?.data?.message || "Silakan coba lagi."}
      />
    );
  }

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          style={{
            borderRadius: 22,
            border: "none",
            background:
              "radial-gradient(circle at top left, rgba(186,230,253,0.28), transparent 30%), linear-gradient(135deg, #0f172a 0%, #0f766e 52%, #22c55e 100%)",
            boxShadow: "0 22px 48px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={14}
          >
            <Space direction='vertical' size={8}>
              <Space>
                <GraduationCap size={16} color='#d1fae5' />
                <Text style={{ color: "#d1fae5", fontWeight: 700 }}>
                  LAPORAN MUSYRIF
                </Text>
              </Space>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: "#f8fafc" }}>
                {data?.musyrif?.full_name || "Musyrif"}
              </Title>
              <Text style={{ color: "rgba(240,253,250,0.9)" }}>
                Rekap capaian target hafalan siswa sesuai halaqoh binaan Anda.
              </Text>
            </Space>

            <Space
              direction={isMobile ? "vertical" : "horizontal"}
              size={10}
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              <Select
                value={selectedPeriodeId}
                options={periodeOptions}
                onChange={(value) => {
                  setPeriodeId(value);
                  setHalaqohId(undefined);
                }}
                placeholder='Pilih periode'
                loading={isFetching}
                style={{ width: isMobile ? "100%" : 240 }}
              />
              <Select
                allowClear
                value={selectedHalaqohId}
                options={halaqohOptions}
                onChange={setHalaqohId}
                placeholder='Semua halaqoh'
                loading={isFetching}
                style={{ width: isMobile ? "100%" : 240 }}
              />
            </Space>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[14, 14]}>
          {summaryCards.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.key}>
              <Card style={{ borderRadius: 18, height: "100%" }}>
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
                      width: 42,
                      height: 42,
                      borderRadius: 12,
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
        <Card
          style={{ borderRadius: 20 }}
          styles={{ body: { padding: isMobile ? 8 : 12 } }}
        >
          <Tabs
            defaultActiveKey='target'
            items={[
              {
                key: "target",
                label: createTabLabel(
                  "Target",
                  <BookOpenCheck size={16} />,
                  "Target aktif halaqoh",
                ),
                children: targetTabContent,
              },
              {
                key: "capaian",
                label: createTabLabel(
                  "Laporan Capaian",
                  <ChartNoAxesColumn size={16} />,
                  "Progres siswa binaan",
                ),
                children: reportTabContent,
              },
            ]}
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default MusyrifReport;
