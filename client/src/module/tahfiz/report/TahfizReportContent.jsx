import { useMemo, useState } from "react";
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
import {
  BookOpenCheck,
  ChartNoAxesColumn,
  CheckCircle2,
  CircleGauge,
  Download,
  GraduationCap,
  Layers3,
  School,
  Users,
} from "lucide-react";
import {
  useGetTahfizReportOptionsQuery,
  useGetTahfizReportSummaryQuery,
} from "../../../service/tahfiz/ApiReport";

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

const TahfizReportContent = ({ mode = "admin" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  const [homebaseId, setHomebaseId] = useState();
  const [periodeId, setPeriodeId] = useState();
  const [gradeId, setGradeId] = useState();
  const [classId, setClassId] = useState();
  const [studentSearch, setStudentSearch] = useState("");

  const optionsQuery = useGetTahfizReportOptionsQuery({
    homebase_id: homebaseId,
    periode_id: periodeId,
    grade_id: gradeId,
    class_id: classId,
  });

  const optionDefaults = optionsQuery.data || {};
  const availableOptionClasses = optionDefaults.classes || [];
  const effectiveHomebaseId =
    mode === "teacher"
      ? (homebaseId ?? optionDefaults.selected_homebase_id ?? undefined)
      : homebaseId;
  const effectivePeriodeId =
    mode === "teacher"
      ? (periodeId ?? optionDefaults.selected_periode_id ?? undefined)
      : periodeId;
  const baseGradeId =
    mode === "teacher"
      ? (gradeId ?? optionDefaults.selected_grade_id ?? undefined)
      : gradeId;
  const baseClassId =
    mode === "teacher"
      ? (classId ?? optionDefaults.selected_class_id ?? undefined)
      : classId;
  const teacherFallbackClassId =
    mode === "teacher" ? availableOptionClasses[0]?.id : undefined;
  const effectiveClassId = baseClassId ?? teacherFallbackClassId;
  const selectedOptionClass = availableOptionClasses.find(
    (item) => item.id === effectiveClassId,
  );
  const effectiveGradeId =
    mode === "teacher"
      ? (selectedOptionClass?.grade_id ?? baseGradeId)
      : baseGradeId;

  const summaryQuery = useGetTahfizReportSummaryQuery({
    homebase_id: effectiveHomebaseId,
    periode_id: effectivePeriodeId,
    grade_id: effectiveGradeId,
    class_id: effectiveClassId,
  });

  const filters = summaryQuery.data?.filters || optionsQuery.data || {};
  const overview = summaryQuery.data?.overview || {};
  const plans = summaryQuery.data?.plans || [];
  const gradeRows = summaryQuery.data?.grade_rows || [];
  const classRows = summaryQuery.data?.class_rows || [];
  const studentRows = summaryQuery.data?.student_rows || [];
  const selectedClassMeta = (filters.classes || []).find(
    (item) => item.id === effectiveClassId,
  );
  const effectiveTeacherGradeId =
    selectedClassMeta?.grade_id || effectiveGradeId || null;
  const visiblePlans =
    mode === "teacher" && effectiveTeacherGradeId
      ? plans.filter((plan) => plan.grade_id === effectiveTeacherGradeId)
      : plans;
  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudentRows = useMemo(() => {
    if (!normalizedStudentSearch) return studentRows;
    return studentRows.filter((item) =>
      String(item.student_name || "")
        .toLowerCase()
        .includes(normalizedStudentSearch),
    );
  }, [studentRows, normalizedStudentSearch]);

  const exportRows = useMemo(() => {
    const targetRows = visiblePlans.flatMap((plan) => {
      if (!plan.items?.length) {
        return [
          {
            Target: plan.title || `Target ${plan.grade_name}`,
            Homebase: plan.homebase_name || "Semua satuan",
            Tingkat: plan.grade_name || "-",
            Item: "-",
            "Total Ayat": plan.target_total_ayahs || 0,
            Catatan: plan.notes || "",
          },
        ];
      }

      return plan.items.map((item) => ({
        Target: plan.title || `Target ${plan.grade_name}`,
        Homebase: plan.homebase_name || "Semua satuan",
        Tingkat: plan.grade_name || "-",
        Item: targetItemLabel(item),
        "Total Ayat": plan.target_total_ayahs || 0,
        Catatan: plan.notes || "",
      }));
    });

    const gradeExportRows = gradeRows.map((item) => ({
      Tingkat: item.grade_name || "-",
      "Jumlah Siswa": item.student_count || 0,
      "Jumlah Kelas": item.class_count || 0,
      "Siswa Tuntas": item.completed_students || 0,
      "Ayat Target": item.target_total_ayahs || 0,
      "Ayat Tercapai": item.achieved_ayahs || 0,
      "Persentase Capaian": renderPercent(item.completion_percentage || 0),
    }));

    const classExportRows = classRows.map((item) => ({
      Kelas: item.class_name || "-",
      Tingkat: item.grade_name || "-",
      "Jumlah Siswa": item.student_count || 0,
      "Siswa Tuntas": item.completed_students || 0,
      "Ayat Target": item.target_total_ayahs || 0,
      "Ayat Tercapai": item.achieved_ayahs || 0,
      "Persentase Capaian": renderPercent(item.completion_percentage || 0),
    }));

    const studentExportRows = filteredStudentRows.map((item) => ({
      "Nama Siswa": item.student_name || "-",
      NIS: item.nis || "-",
      Kelas: item.class_name || "-",
      Tingkat: item.grade_name || "-",
      Target: item.plan_title || "-",
      "Ayat Target": item.target_total_ayahs || 0,
      "Ayat Tercapai": item.achieved_ayahs || 0,
      "Persentase Capaian": renderPercent(item.completion_percentage || 0),
      Status: item.is_completed ? "Tuntas" : "Proses",
    }));

    return {
      targetRows,
      gradeExportRows,
      classExportRows,
      studentExportRows,
    };
  }, [visiblePlans, gradeRows, classRows, filteredStudentRows]);

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const filterRows = [
      {
        Homebase: selectedHomebaseLabel,
        Periode: selectedPeriodeLabel,
        Tingkat: selectedGradeLabel,
        Kelas: selectedClassLabel,
      },
    ];
    const safeFileScope = [
      selectedHomebaseLabel,
      selectedPeriodeLabel,
      selectedGradeLabel,
      selectedClassLabel,
    ]
      .filter(Boolean)
      .join("_")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const appendSheet = (rows, sheetName) => {
      const safeRows = rows.length ? rows : [{ Info: "Belum ada data" }];
      const worksheet = XLSX.utils.json_to_sheet(safeRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    };

    appendSheet(filterRows, "Filter");
    appendSheet(exportRows.targetRows, "Target");
    if (mode === "admin") {
      appendSheet(exportRows.gradeExportRows, "Tingkat");
      appendSheet(exportRows.classExportRows, "Kelas");
    }
    appendSheet(exportRows.studentExportRows, "Siswa");

    const filePrefix =
      mode === "teacher" ? "Laporan_Tahfiz_Guru" : "Laporan_Tahfiz_Admin";
    XLSX.writeFile(workbook, `${filePrefix}_${safeFileScope}.xlsx`);
  };

  const homebaseOptions = (filters.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const periodeOptions = (filters.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));
  const gradeOptions = (filters.grades || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const classOptions = (filters.classes || []).map((item) => ({
    value: item.id,
    label: `${item.grade_name ? `${item.grade_name} - ` : ""}${item.name}`,
  }));
  const selectedHomebaseLabel =
    homebaseOptions.find((item) => item.value === effectiveHomebaseId)?.label ||
    "Semua satuan";
  const selectedPeriodeLabel =
    periodeOptions.find((item) => item.value === effectivePeriodeId)?.label ||
    "Semua periode";
  const selectedGradeLabel =
    gradeOptions.find((item) => item.value === effectiveGradeId)?.label ||
    "Semua tingkat";
  const selectedClassLabel =
    classOptions.find((item) => item.value === effectiveClassId)?.label ||
    "Semua kelas";

  const headerCopy = useMemo(
    () =>
      mode === "teacher"
        ? {
            eyebrow: "LAPORAN WALI KELAS",
            title: "Pantau Capaian Target Hafalan Siswa",
            description:
              "Lihat progres hafalan berdasarkan target yang sudah ditetapkan berdasarkan siswa di kelas binaan Anda.",
          }
        : {
            eyebrow: "LAPORAN TAHFIZ",
            title: "Rekap Capaian Target Hafalan",
            description:
              "Pantau ketercapaian target tahfiz per tingkat, kelas, dan siswa dalam satu panel laporan yang mudah dibaca.",
          },
    [mode],
  );

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

  const gradeColumns = [
    {
      title: "Tingkat",
      dataIndex: "grade_name",
      render: (value, record) => (
        <Space vertical size={2}>
          <Text strong>{value}</Text>
          <Text type='secondary'>{record.class_count} kelas terpetakan</Text>
        </Space>
      ),
    },
    {
      title: "Siswa",
      dataIndex: "student_count",
      width: 110,
    },
    {
      title: "Ayat Tercapai",
      key: "achievement",
      width: 200,
      render: (_, record) => (
        <Text>
          {record.achieved_ayahs} / {record.target_total_ayahs}
        </Text>
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

  const classColumns = [
    {
      title: "Kelas",
      dataIndex: "class_name",
      render: (value, record) => (
        <Space vertical size={2}>
          <Text strong>{value}</Text>
          <Text type='secondary'>{record.grade_name}</Text>
        </Space>
      ),
    },
    {
      title: "Siswa",
      dataIndex: "student_count",
      width: 110,
    },
    {
      title: "Tuntas",
      dataIndex: "completed_students",
      width: 110,
      render: (value) => <Badge color='#22c55e' text={`${value} siswa`} />,
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

  const studentColumns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space vertical size={2}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>NIS: {record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Kelas",
      key: "class",
      render: (_, record) => (
        <Space vertical size={2}>
          <Text>{record.class_name}</Text>
          <Text type='secondary'>{record.grade_name}</Text>
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

  const filterContent = (
    <Card
      variant='borderless'
      style={{
        borderRadius: token.borderRadiusXL,
        boxShadow: token.boxShadowSecondary,
      }}
      styles={{ body: { padding: isMobile ? 14 : 18 } }}
    >
      <Row gutter={[12, 12]}>
        {mode === "admin" ? (
          <Col xs={24} md={6}>
            <Select
              allowClear
              value={effectiveHomebaseId}
              placeholder='Pilih satuan'
              options={homebaseOptions}
              style={{ width: "100%" }}
              loading={optionsQuery.isFetching}
              onChange={(value) => {
                setHomebaseId(value);
                setPeriodeId(undefined);
                setGradeId(undefined);
                setClassId(undefined);
              }}
            />
          </Col>
        ) : null}
        <Col xs={24} md={mode === "admin" ? 6 : 8}>
          <Select
            allowClear
            value={effectivePeriodeId}
            placeholder='Pilih periode'
            options={periodeOptions}
            style={{ width: "100%" }}
            loading={optionsQuery.isFetching}
            onChange={(value) => {
              setPeriodeId(value);
              setGradeId(undefined);
              setClassId(undefined);
            }}
          />
        </Col>
        <Col xs={24} md={mode === "admin" ? 6 : 8}>
          <Select
            allowClear
            value={effectiveGradeId}
            placeholder='Pilih tingkat'
            options={gradeOptions}
            style={{ width: "100%" }}
            loading={optionsQuery.isFetching}
            onChange={(value) => {
              setGradeId(value);
              setClassId(undefined);
            }}
          />
        </Col>
        <Col xs={24} md={mode === "admin" ? 6 : 8}>
          <Select
            allowClear
            value={effectiveClassId}
            placeholder='Pilih kelas'
            options={classOptions}
            style={{ width: "100%" }}
            loading={optionsQuery.isFetching}
            onChange={setClassId}
          />
        </Col>
      </Row>
    </Card>
  );

  const summaryContent = (
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
              <Space vertical size={4}>
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
  );

  const targetContent = (
    <Space vertical size={18} style={{ width: "100%" }}>
      <Card
        variant='borderless'
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={12}
        >
          <Space vertical size={3}>
            <Text strong>
              {mode === "teacher"
                ? "Target untuk kelas dan tingkat binaan"
                : "Target yang dipakai pada laporan"}
            </Text>
            <Text type='secondary'>
              {mode === "teacher"
                ? "Hanya target yang sesuai dengan kelas homeroom dan tingkat yang Anda ampu yang ditampilkan."
                : "Target aktif dihitung berdasarkan periode dan tingkat yang dipilih."}
            </Text>
          </Space>
          <Badge color='#0ea5e9' text={`${visiblePlans.length} plan aktif`} />
        </Flex>

        <div style={{ marginTop: 16 }}>
          {visiblePlans.length ? (
            <Space size={[8, 10]} wrap>
              {visiblePlans.map((plan) => (
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
                  <Space vertical size={8} style={{ width: "100%" }}>
                    <div>
                      <Text strong>
                        {plan.title || `Target ${plan.grade_name}`}
                      </Text>
                      <br />
                      <Text type='secondary'>
                        {plan.homebase_name || "Semua satuan"} |{" "}
                        {plan.grade_name}
                      </Text>
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
        </div>
      </Card>

      {!visiblePlans.length ? (
        <Alert
          type='info'
          showIcon
          message='Belum ada target aktif untuk filter yang dipilih'
          description='Buat atau aktifkan target tahfiz terlebih dahulu agar capaian tingkat, kelas, dan siswa bisa dihitung.'
        />
      ) : null}
    </Space>
  );

  const gradeContent = (
    <Card
      variant='borderless'
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      <Space vertical size={14} style={{ width: "100%" }}>
        <Flex align='center' justify='space-between' wrap='wrap' gap={10}>
          <Text strong>Ringkasan per Tingkat</Text>
          <Badge color='#22c55e' text={`${gradeRows.length} tingkat`} />
        </Flex>
        <Table
          rowKey='grade_id'
          columns={gradeColumns}
          dataSource={gradeRows}
          loading={summaryQuery.isLoading || summaryQuery.isFetching}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description='Belum ada data tingkat' /> }}
        />
      </Space>
    </Card>
  );

  const classContent = (
    <Card
      variant='borderless'
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      <Space vertical size={14} style={{ width: "100%" }}>
        <Flex align='center' justify='space-between' wrap='wrap' gap={10}>
          <Text strong>Ringkasan per Kelas</Text>
          <Badge color='#0ea5e9' text={`${classRows.length} kelas`} />
        </Flex>
        <Table
          rowKey='class_id'
          columns={classColumns}
          dataSource={classRows}
          loading={summaryQuery.isLoading || summaryQuery.isFetching}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description='Belum ada data kelas' /> }}
        />
      </Space>
    </Card>
  );

  const studentContent = (
    <Card
      variant='borderless'
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      <Space vertical size={14} style={{ width: "100%" }}>
        <Flex align='center' justify='space-between' wrap='wrap' gap={10}>
          <Text strong>Ringkasan per Siswa</Text>
          <Badge color='#f59e0b' text={`${filteredStudentRows.length} siswa`} />
        </Flex>
        <Input.Search
          allowClear
          placeholder='Cari nama siswa'
          value={studentSearch}
          onChange={(event) => setStudentSearch(event.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Table
          rowKey='student_id'
          columns={studentColumns}
          dataSource={filteredStudentRows}
          loading={summaryQuery.isLoading || summaryQuery.isFetching}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 980 }}
          locale={{ emptyText: <Empty description='Belum ada data siswa' /> }}
        />
      </Space>
    </Card>
  );

  if (optionsQuery.isError || summaryQuery.isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat laporan tahfiz.'
        description={
          summaryQuery.error?.data?.message ||
          optionsQuery.error?.data?.message ||
          "Silakan periksa koneksi server atau schema tahfiz terlebih dahulu."
        }
      />
    );
  }

  const reportTabItems = [
    {
      key: "target",
      label: createTabLabel(
        "Target",
        <BookOpenCheck size={16} />,
        "Target aktif yang digunakan",
      ),
      children: targetContent,
    },
    {
      key: "grade",
      label: createTabLabel(
        "Tingkat",
        <Layers3 size={16} />,
        "Rekap per tingkat",
      ),
      children: gradeContent,
    },
    {
      key: "class",
      label: createTabLabel("Kelas", <School size={16} />, "Rekap per kelas"),
      children: classContent,
    },
    {
      key: "student",
      label: createTabLabel(
        "Siswa",
        <ChartNoAxesColumn size={16} />,
        "Rekap per siswa",
      ),
      children: studentContent,
    },
  ].filter(Boolean);

  const tabItems =
    mode === "teacher"
      ? reportTabItems.filter(
          (item) => item.key !== "grade" && item.key !== "class",
        )
      : reportTabItems;

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
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  lineHeight: 1.15,
                }}
              >
                {headerCopy.title}
              </Title>

              <Text
                style={{
                  maxWidth: 680,
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
                disabled={summaryQuery.isLoading || summaryQuery.isFetching}
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
                    "Target aktif per tingkat",
                    "Capaian kelas secara agregat",
                    "Progres siswa sampai tuntas",
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

      <MotionDiv variants={itemVariants}>{filterContent}</MotionDiv>

      <MotionDiv variants={itemVariants}>{summaryContent}</MotionDiv>

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
            defaultActiveKey='target'
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default TahfizReportContent;
