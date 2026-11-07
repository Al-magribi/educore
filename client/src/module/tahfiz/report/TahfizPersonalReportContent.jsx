import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
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
import {
  BookOpenCheck,
  CalendarRange,
  ChartNoAxesColumn,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  ScrollText,
  Users,
} from "lucide-react";
import { useGetTahfizPersonalSummaryQuery } from "../../../service/tahfiz/ApiReport";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

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
  if (item.target_type === "juz") {
    return `Juz ${item.juz_number ?? "-"}`;
  }

  if (item.start_ayat && item.end_ayat) {
    return `${item.surah_number}. ${item.surah_name_latin} (${item.start_ayat}-${item.end_ayat})`;
  }

  return `${item.surah_number}. ${item.surah_name_latin}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const rangeLabel = (record) => {
  const startLabel = `${record.start_surah_number || "-"}. ${record.start_surah_name || "-"}`;
  const endSurahNumber = record.end_surah_number || record.start_surah_number;
  const endSurahName = record.end_surah_name || record.start_surah_name;
  const endLabel = `${endSurahNumber || "-"}. ${endSurahName || "-"}`;

  if (record.start_surah_number === endSurahNumber) {
    return `${startLabel} ayat ${record.start_ayat || "-"}-${record.end_ayat || "-"}`;
  }

  return `${startLabel}:${record.start_ayat || "-"} s.d. ${endLabel}:${record.end_ayat || "-"}`;
};

const TahfizPersonalReportContent = ({ mode = "student" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const { data, isLoading, isFetching, isError, error } =
    useGetTahfizPersonalSummaryQuery();

  const reports = data?.students || [];
  const overview = data?.overview || {};
  const viewer = data?.viewer || {};
  const [activeStudentId, setActiveStudentId] = useState();

  useEffect(() => {
    if (!reports.length) {
      setActiveStudentId(undefined);
      return;
    }

    if (!activeStudentId || !reports.some((item) => item.student?.student_id === activeStudentId)) {
      setActiveStudentId(reports[0].student?.student_id);
    }
  }, [activeStudentId, reports]);

  const activeReport = useMemo(() => {
    if (!reports.length) return null;
    return (
      reports.find((item) => item.student?.student_id === activeStudentId) ||
      reports[0]
    );
  }, [activeStudentId, reports]);

  const student = activeReport?.student || {};
  const planRows = activeReport?.student_rows || [];
  const plans = activeReport?.plans || [];
  const recentRecords = activeReport?.recent_records || [];

  const headerCopy = useMemo(
    () =>
      mode === "parent"
        ? {
            eyebrow: "LAPORAN ORANG TUA",
            title: "Pantau Progres Tahfiz Setiap Anak",
            description:
              "Lihat target, capaian hafalan, dan riwayat setoran Tahfiz dalam satu tampilan yang mudah dipantau dari akun orang tua.",
          }
        : {
            eyebrow: "LAPORAN SISWA",
            title: "Pantau Capaian Hafalanmu",
            description:
              "Lihat target aktif, progres pencapaian, dan riwayat setoran terakhir agar hafalan tetap terarah dari waktu ke waktu.",
          },
    [mode],
  );

  const studentOptions = reports.map((item) => ({
    value: item.student?.student_id,
    label: item.student?.student_name || `Siswa ${item.student?.student_id}`,
  }));

  const exportRows = useMemo(
    () => ({
      summaryRows: [
        {
          Siswa: student.student_name || "-",
          NIS: student.nis || "-",
          Kelas: student.class_name || "-",
          Tingkat: student.grade_name || "-",
          Periode: student.periode_name || "-",
          Sekolah: student.homebase_name || "-",
        },
      ],
      planRows: planRows.map((item) => ({
        Target: item.plan_title || "-",
        "Ayat Target": item.target_total_ayahs || 0,
        "Ayat Tercapai": item.achieved_ayahs || 0,
        "Persentase Capaian": renderPercent(item.completion_percentage || 0),
        Status: item.is_completed ? "Tuntas" : "Proses",
      })),
      targetRows: plans.flatMap((plan) =>
        (plan.items || []).length
          ? plan.items.map((item) => ({
              Target: plan.title || `Target ${plan.grade_name}`,
              Item: targetItemLabel(item),
              "Total Ayat": plan.target_total_ayahs || 0,
              Catatan: plan.notes || "",
            }))
          : [
              {
                Target: plan.title || `Target ${plan.grade_name}`,
                Item: "-",
                "Total Ayat": plan.target_total_ayahs || 0,
                Catatan: plan.notes || "",
              },
            ],
      ),
      recentRows: recentRecords.map((item) => ({
        Tanggal: formatDate(item.date),
        Aktivitas: item.activity_name || "-",
        Rentang: rangeLabel(item),
        Kelancaran: item.fluency_grade || "-",
        Tajwid: item.tajweed_grade || "-",
        Pencatat: item.recorded_by_name || item.recorded_by_role || "-",
        Catatan: item.note || "",
      })),
    }),
    [planRows, plans, recentRecords, student],
  );

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const appendSheet = (rows, sheetName) => {
      const safeRows = rows.length ? rows : [{ Info: "Belum ada data" }];
      const worksheet = XLSX.utils.json_to_sheet(safeRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    };

    appendSheet(exportRows.summaryRows, "Profil");
    appendSheet(exportRows.planRows, "Capaian");
    appendSheet(exportRows.targetRows, "Target");
    appendSheet(exportRows.recentRows, "Riwayat");

    const safeName = (student.student_name || "laporan-tahfiz")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    XLSX.writeFile(workbook, `laporan_tahfiz_${safeName}.xlsx`);
  };

  const summaryCards =
    mode === "parent"
      ? [
          {
            key: "children",
            title: "Anak Terhubung",
            value: overview.students_total || 0,
            icon: <Users size={18} />,
            bg: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
            color: "#0369a1",
          },
          {
            key: "plans",
            title: "Plan Aktif",
            value: overview.active_plan_count || 0,
            icon: <BookOpenCheck size={18} />,
            bg: "linear-gradient(135deg, #dcfce7, #d1fae5)",
            color: "#15803d",
          },
          {
            key: "average",
            title: "Rata-rata Capaian",
            value: renderPercent(overview.average_completion_percentage || 0),
            icon: <ChartNoAxesColumn size={18} />,
            bg: "linear-gradient(135deg, #fef3c7, #fde68a)",
            color: "#b45309",
          },
          {
            key: "records",
            title: "Total Setoran",
            value: overview.total_records || 0,
            icon: <ScrollText size={18} />,
            bg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
            color: "#6d28d9",
          },
        ]
      : [
          {
            key: "plans",
            title: "Plan Aktif",
            value: activeReport?.overview?.active_plan_count || 0,
            icon: <BookOpenCheck size={18} />,
            bg: "linear-gradient(135deg, #dcfce7, #d1fae5)",
            color: "#15803d",
          },
          {
            key: "average",
            title: "Rata-rata Capaian",
            value: renderPercent(
              activeReport?.overview?.average_completion_percentage || 0,
            ),
            icon: <ChartNoAxesColumn size={18} />,
            bg: "linear-gradient(135deg, #fef3c7, #fde68a)",
            color: "#b45309",
          },
          {
            key: "records",
            title: "Total Setoran",
            value: activeReport?.overview?.total_records || 0,
            icon: <ScrollText size={18} />,
            bg: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
            color: "#0369a1",
          },
          {
            key: "ziyadah",
            title: "Setoran Ziyadah",
            value: activeReport?.overview?.ziyadah_records || 0,
            icon: <CheckCircle2 size={18} />,
            bg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
            color: "#6d28d9",
          },
        ];

  const planColumns = [
    {
      title: "Target",
      dataIndex: "plan_title",
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Ayat",
      key: "achievement",
      width: 180,
      render: (_, record) => (
        <Text>
          {record.achieved_ayahs} / {record.target_total_ayahs}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_completed",
      width: 120,
      render: (value) => (
        <Tag color={value ? "green" : "blue"}>
          {value ? "Tuntas" : "Proses"}
        </Tag>
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

  const recordColumns = [
    {
      title: "Tanggal",
      dataIndex: "date",
      width: 120,
      render: (value) => formatDate(value),
    },
    {
      title: "Aktivitas",
      dataIndex: "activity_name",
      width: 130,
      render: (value, record) => (
        <Space direction='vertical' size={2}>
          <Text strong>{value || "-"}</Text>
          <Text type='secondary'>{record.activity_code || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Rentang Setoran",
      key: "range",
      render: (_, record) => <Text>{rangeLabel(record)}</Text>,
    },
    {
      title: "Penilaian",
      key: "grade",
      width: 150,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text>Kelancaran: {record.fluency_grade || "-"}</Text>
          <Text>Tajwid: {record.tajweed_grade || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Pencatat",
      key: "recorder",
      width: 170,
      render: (_, record) => (
        <Space direction='vertical' size={2}>
          <Text>{record.recorded_by_name || "-"}</Text>
          <Text type='secondary'>{record.recorded_by_role || "-"}</Text>
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat laporan tahfiz personal.'
        description={
          error?.data?.message ||
          "Silakan periksa koneksi server atau schema tahfiz terlebih dahulu."
        }
      />
    );
  }

  const studentIdentityContent = activeReport ? (
    <Card
      variant='borderless'
      style={{
        borderRadius: token.borderRadiusXL,
        boxShadow: token.boxShadowSecondary,
      }}
      styles={{ body: { padding: isMobile ? 14 : 18 } }}
    >
      <Row gutter={[14, 14]} align='middle'>
        <Col xs={24} xl={mode === "parent" && reports.length > 1 ? 16 : 24}>
          <Space direction='vertical' size={8} style={{ width: "100%" }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {student.student_name || "-"}
              </Title>
              <Text type='secondary'>
                NIS {student.nis || "-"} | {student.class_name || "-"} |{" "}
                {student.grade_name || "-"}
              </Text>
            </div>
            <Space size={[8, 8]} wrap>
              <Tag color='blue'>{student.homebase_name || "Sekolah"}</Tag>
              <Tag color='cyan'>{student.periode_name || "Periode belum aktif"}</Tag>
              <Tag color='green'>
                Update terakhir: {formatDate(activeReport.overview?.last_record_date)}
              </Tag>
            </Space>
          </Space>
        </Col>
        {mode === "parent" && reports.length > 1 ? (
          <Col xs={24} xl={8}>
            <Select
              value={activeStudentId}
              onChange={setActiveStudentId}
              options={studentOptions}
              style={{ width: "100%" }}
              placeholder='Pilih siswa'
            />
          </Col>
        ) : null}
      </Row>
    </Card>
  ) : null;

  const summaryContent = activeReport ? (
    <Space direction='vertical' size={18} style={{ width: "100%" }}>
      {studentIdentityContent}
      <Card
        variant='borderless'
        style={{
          borderRadius: token.borderRadiusXL,
          boxShadow: token.boxShadowSecondary,
        }}
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <Space direction='vertical' size={14} style={{ width: "100%" }}>
          <Flex align='center' justify='space-between' wrap='wrap' gap={10}>
            <Text strong>Ringkasan Capaian per Target</Text>
            <Badge color='#22c55e' text={`${planRows.length} target`} />
          </Flex>
          <Table
            rowKey={(record) => `${record.student_id}-${record.plan_id}`}
            columns={planColumns}
            dataSource={planRows}
            loading={isLoading || isFetching}
            pagination={false}
            scroll={{ x: 820 }}
            locale={{ emptyText: <Empty description='Belum ada target aktif' /> }}
          />
        </Space>
      </Card>
    </Space>
  ) : (
    <Empty description='Belum ada data siswa tahfiz yang terhubung.' />
  );

  const targetContent = activeReport ? (
    <Card
      variant='borderless'
      style={{
        borderRadius: token.borderRadiusXL,
        boxShadow: token.boxShadowSecondary,
      }}
      styles={{ body: { padding: isMobile ? 14 : 18 } }}
    >
      {plans.length ? (
        <Space size={[10, 10]} wrap style={{ width: "100%" }}>
          {plans.map((plan) => (
            <Card
              key={plan.plan_id}
              size='small'
              style={{
                minWidth: isMobile ? "100%" : 300,
                borderRadius: 16,
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                border: "1px solid #dbeafe",
              }}
            >
              <Space direction='vertical' size={10} style={{ width: "100%" }}>
                <div>
                  <Text strong>{plan.title || `Target ${plan.grade_name}`}</Text>
                  <br />
                  <Text type='secondary'>
                    {plan.homebase_name || "-"} | {plan.grade_name || "-"}
                  </Text>
                </div>
                <Progress
                  percent={toPercent(
                    planRows.find((item) => item.plan_id === plan.plan_id)
                      ?.completion_percentage || 0,
                  )}
                  status={getProgressStatus(
                    planRows.find((item) => item.plan_id === plan.plan_id)
                      ?.completion_percentage || 0,
                  )}
                  size='small'
                  format={() =>
                    renderPercent(
                      planRows.find((item) => item.plan_id === plan.plan_id)
                        ?.completion_percentage || 0,
                    )
                  }
                />
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
                {plan.notes ? <Text type='secondary'>{plan.notes}</Text> : null}
              </Space>
            </Card>
          ))}
        </Space>
      ) : (
        <Empty description='Belum ada target aktif untuk siswa ini' />
      )}
    </Card>
  ) : (
    <Empty description='Belum ada target aktif.' />
  );

  const historyContent = activeReport ? (
    <Card
      variant='borderless'
      style={{
        borderRadius: token.borderRadiusXL,
        boxShadow: token.boxShadowSecondary,
      }}
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      <Space direction='vertical' size={14} style={{ width: "100%" }}>
        <Flex align='center' justify='space-between' wrap='wrap' gap={10}>
          <Text strong>Riwayat Setoran Terbaru</Text>
          <Badge color='#0ea5e9' text={`${recentRecords.length} entri`} />
        </Flex>
        <Table
          rowKey='id'
          columns={recordColumns}
          dataSource={recentRecords}
          loading={isLoading || isFetching}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 1080 }}
          locale={{ emptyText: <Empty description='Belum ada riwayat setoran' /> }}
        />
      </Space>
    </Card>
  ) : (
    <Empty description='Belum ada riwayat setoran.' />
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

  const tabItems = [
    {
      key: "summary",
      label: createTabLabel(
        "Ringkasan",
        <ChartNoAxesColumn size={16} />,
        "Progress target per siswa",
      ),
      children: summaryContent,
    },
    {
      key: "target",
      label: createTabLabel(
        "Target",
        <BookOpenCheck size={16} />,
        "Detail target aktif",
      ),
      children: targetContent,
    },
    {
      key: "history",
      label: createTabLabel(
        "Riwayat",
        <FileText size={16} />,
        "Setoran terbaru",
      ),
      children: historyContent,
    },
  ];

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            borderRadius: token.borderRadiusXL,
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(circle at top left, rgba(125,211,252,0.24), transparent 26%), linear-gradient(135deg, #0f172a 0%, #0f766e 48%, #22c55e 100%)",
            boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 26 } }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
              pointerEvents: "none",
            }}
          />

          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={16}
            style={{ position: "relative" }}
          >
            <Flex vertical gap={10}>
              <Flex
                align='center'
                gap={8}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "#ecfeff",
                  fontWeight: 700,
                  letterSpacing: 0.4,
                }}
              >
                <GraduationCap size={16} />
                <span>{headerCopy.eyebrow}</span>
              </Flex>

              <Title
                level={isMobile ? 3 : 2}
                style={{ margin: 0, color: "#f8fafc", lineHeight: 1.15 }}
              >
                {headerCopy.title}
              </Title>

              <Text
                style={{
                  maxWidth: 700,
                  color: "rgba(240,249,255,0.88)",
                  fontSize: isMobile ? 14 : 15,
                }}
              >
                {headerCopy.description}
              </Text>

              <Button
                type='primary'
                icon={<Download size={16} />}
                onClick={handleExportExcel}
                disabled={!activeReport || isLoading || isFetching}
                style={{
                  width: "fit-content",
                  background: "#f8fafc",
                  color: "#0f172a",
                  borderColor: "#f8fafc",
                }}
              >
                Download Excel
              </Button>
            </Flex>

            {!isMobile && (
              <Card
                variant='borderless'
                style={{
                  minWidth: 250,
                  borderRadius: 22,
                  background: "rgba(15, 23, 42, 0.18)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(8px)",
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Flex vertical gap={10}>
                  <Text
                    style={{
                      color: "#d1fae5",
                      fontWeight: 700,
                      letterSpacing: 0.3,
                    }}
                  >
                    Fokus Laporan
                  </Text>
                  {[
                    "Target hafalan yang sedang berjalan",
                    "Capaian per plan untuk tiap siswa",
                    "Riwayat setoran terbaru dan penilaian",
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.10)",
                        color: "#f8fafc",
                        fontSize: 14,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </Flex>
              </Card>
            )}
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[14, 14]}>
          {summaryCards.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.key}>
              <Card
                variant='borderless'
                style={{
                  borderRadius: 20,
                  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.07)",
                  height: "100%",
                }}
                styles={{ body: { padding: 18 } }}
              >
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
        <Card
          variant='borderless'
          style={{
            borderRadius: token.borderRadiusXL,
            boxShadow: token.boxShadowSecondary,
          }}
          styles={{ body: { padding: isMobile ? 12 : 16 } }}
        >
          <Tabs
            items={tabItems}
            defaultActiveKey='summary'
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
          />
        </Card>
      </MotionDiv>

      {isLoading && !reports.length ? (
        <MotionDiv variants={itemVariants}>
          <Card
            variant='borderless'
            style={{
              borderRadius: token.borderRadiusXL,
              boxShadow: token.boxShadowSecondary,
            }}
          >
            <Flex align='center' gap={10}>
              <CalendarRange size={16} />
              <Text>Memuat laporan tahfiz personal...</Text>
            </Flex>
          </Card>
        </MotionDiv>
      ) : null}
    </MotionDiv>
  );
};

export default TahfizPersonalReportContent;
