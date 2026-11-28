import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Grid,
  Progress,
  Select,
  Skeleton,
  Table,
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
import { CardTitle, MuseCard, PageTabs, StatCard } from "../../../components/ui/muse";
import { DataListCard } from "../../../components/ui/muse/DataSection";
import { museRadius } from "../../../config/theme";
import {
  useGetTahfizReportOptionsQuery,
  useGetTahfizReportSummaryQuery,
} from "../../../service/tahfiz/ApiReport";

const { useBreakpoint } = Grid;
const { Text } = Typography;

const toPercent = (value) => Number(value || 0);

const renderPercent = (value) => {
  const numericValue = toPercent(value);
  if (numericValue >= 100) return "100%";
  return `${numericValue.toFixed(2).replace(/\.00$/, "")}%`;
};

const getProgressStatus = (value) => {
  const numericValue = toPercent(value);
  if (numericValue >= 100) return "success";
  return "normal";
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

  const headerCopy =
    mode === "teacher"
      ? {
          title: "Laporan Tahfiz Kelas",
          description:
            "Pantau capaian target hafalan siswa di kelas binaan Anda berdasarkan target yang berlaku.",
        }
      : {
          title: "Laporan Tahfiz",
          description:
            "Rekap ketercapaian target tahfiz per tingkat, kelas, dan siswa.",
        };

  const isSummaryLoading = summaryQuery.isLoading || summaryQuery.isFetching;

  const summaryCards = [
    { title: "Siswa Terpetakan", value: overview.total_students || 0, icon: <Users size={24} />, tone: "primary" },
    { title: "Target Aktif", value: overview.active_plan_count || 0, icon: <BookOpenCheck size={24} />, tone: "accent" },
    {
      title: "Rata-rata Capaian",
      value: renderPercent(overview.average_completion_percentage || 0),
      icon: <CircleGauge size={24} />,
      tone: "warning",
    },
    { title: "Siswa Tuntas", value: overview.completed_students || 0, icon: <CheckCircle2 size={24} />, tone: "success" },
  ];

  const renderProgress = (value) => (
    <Progress
      percent={toPercent(value)}
      status={getProgressStatus(value)}
      size='small'
      format={() => renderPercent(value)}
      style={{ minWidth: 160, margin: 0 }}
    />
  );

  const gradeColumns = [
    {
      title: "TINGKAT",
      dataIndex: "grade_name",
      render: (value, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {value}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.class_count} kelas terpetakan
          </Text>
        </div>
      ),
    },
    { title: "SISWA", dataIndex: "student_count", width: 110, align: "right" },
    {
      title: "AYAT TERCAPAI",
      key: "achievement",
      width: 180,
      align: "right",
      render: (_, record) => `${record.achieved_ayahs} / ${record.target_total_ayahs}`,
    },
    { title: "CAPAIAN", dataIndex: "completion_percentage", width: 240, render: renderProgress },
  ];

  const classColumns = [
    {
      title: "KELAS",
      dataIndex: "class_name",
      render: (value, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {value}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.grade_name}
          </Text>
        </div>
      ),
    },
    { title: "SISWA", dataIndex: "student_count", width: 110, align: "right" },
    { title: "TUNTAS", dataIndex: "completed_students", width: 120, align: "right" },
    { title: "CAPAIAN", dataIndex: "completion_percentage", width: 240, render: renderProgress },
  ];

  const studentColumns = [
    {
      title: "SISWA",
      key: "student",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.student_name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            NIS {record.nis || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "KELAS",
      key: "class",
      render: (_, record) => (
        <div>
          <Text style={{ display: "block" }}>{record.class_name}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.grade_name}
          </Text>
        </div>
      ),
    },
    {
      title: "TARGET",
      key: "target",
      width: 170,
      align: "right",
      render: (_, record) => `${record.achieved_ayahs} / ${record.target_total_ayahs} ayat`,
    },
    {
      title: "STATUS",
      dataIndex: "is_completed",
      width: 120,
      render: (value) => (
        <Tag color={value ? "success" : "processing"} style={{ marginInlineEnd: 0 }}>
          {value ? "Tuntas" : "Proses"}
        </Tag>
      ),
    },
    { title: "CAPAIAN", dataIndex: "completion_percentage", width: 240, render: renderProgress },
  ];

  const filterWidth = isMobile ? "100%" : 170;
  const headerExtra = (
    <>
      {mode === "admin" ? (
        <Select
          aria-label='Filter satuan'
          allowClear
          value={effectiveHomebaseId}
          placeholder='Semua satuan'
          options={homebaseOptions}
          style={{ width: filterWidth }}
          loading={optionsQuery.isFetching}
          onChange={(value) => {
            setHomebaseId(value);
            setPeriodeId(undefined);
            setGradeId(undefined);
            setClassId(undefined);
          }}
        />
      ) : null}
      <Select
        aria-label='Filter periode'
        allowClear
        value={effectivePeriodeId}
        placeholder='Semua periode'
        options={periodeOptions}
        style={{ width: filterWidth }}
        loading={optionsQuery.isFetching}
        onChange={(value) => {
          setPeriodeId(value);
          setGradeId(undefined);
          setClassId(undefined);
        }}
      />
      <Select
        aria-label='Filter tingkat'
        allowClear
        value={effectiveGradeId}
        placeholder='Semua tingkat'
        options={gradeOptions}
        style={{ width: filterWidth }}
        loading={optionsQuery.isFetching}
        onChange={(value) => {
          setGradeId(value);
          setClassId(undefined);
        }}
      />
      <Select
        aria-label='Filter kelas'
        allowClear
        value={effectiveClassId}
        placeholder='Semua kelas'
        options={classOptions}
        style={{ width: filterWidth }}
        loading={optionsQuery.isFetching}
        onChange={setClassId}
      />
      <Button
        icon={<Download size={16} />}
        onClick={handleExportExcel}
        disabled={isSummaryLoading}
        block={isMobile}
      >
        Unduh Excel
      </Button>
    </>
  );

  const errorAlert =
    optionsQuery.isError || summaryQuery.isError ? (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat laporan tahfiz'
        description={
          summaryQuery.error?.data?.message ||
          optionsQuery.error?.data?.message ||
          "Periksa koneksi server lalu muat ulang halaman."
        }
      />
    ) : null;

  const overviewBlock = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: isMobile ? 16 : 24,
      }}
    >
      {summaryCards.map((item) =>
        summaryQuery.isLoading ? (
          <MuseCard key={item.title}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </MuseCard>
        ) : (
          <StatCard key={item.title} {...item} />
        ),
      )}
    </div>
  );

  const withOverview = (section) => (
    <Flex vertical gap={isMobile ? 16 : 24}>
      {errorAlert}
      {overviewBlock}
      {section}
    </Flex>
  );

  const targetContent = (
    <MuseCard
      title={
        <CardTitle
          icon={<BookOpenCheck size={18} />}
          title={mode === "teacher" ? "Target Kelas Binaan" : "Target yang Dipakai"}
          description={
            mode === "teacher"
              ? "Hanya target untuk tingkat kelas binaan Anda yang ditampilkan."
              : "Target aktif dihitung dari periode dan tingkat yang dipilih."
          }
        />
      }
      extra={<Tag style={{ marginInlineEnd: 0 }}>{visiblePlans.length} plan aktif</Tag>}
    >
      {isSummaryLoading && !visiblePlans.length ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : visiblePlans.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {visiblePlans.map((plan) => (
            <div
              key={plan.plan_id}
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: museRadius.item,
                padding: 16,
              }}
            >
              <Text strong style={{ display: "block" }}>
                {plan.title || `Target ${plan.grade_name}`}
              </Text>
              <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                {plan.homebase_name || "Semua satuan"} · {plan.grade_name} ·{" "}
                {plan.target_total_ayahs || 0} ayat
              </Text>
              <Flex gap={6} wrap style={{ marginTop: 12 }}>
                {(plan.items || []).map((item) => (
                  <Tag
                    key={item.id}
                    color={item.target_type === "juz" ? "gold" : "blue"}
                    style={{ marginInlineEnd: 0 }}
                  >
                    {targetItemLabel(item)}
                  </Tag>
                ))}
              </Flex>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='Belum ada target aktif untuk filter ini. Buat atau aktifkan target tahfiz agar capaian bisa dihitung.'
        />
      )}
    </MuseCard>
  );

  const gradeContent = (
    <MuseCard
      flush
      title={
        <CardTitle
          icon={<Layers3 size={18} />}
          title='Ringkasan per Tingkat'
          description={`${gradeRows.length} tingkat`}
        />
      }
    >
      <Table
        rowKey='grade_id'
        columns={gradeColumns}
        dataSource={gradeRows}
        loading={isSummaryLoading}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada data tingkat untuk filter ini.' /> }}
      />
    </MuseCard>
  );

  const classContent = (
    <MuseCard
      flush
      title={
        <CardTitle
          icon={<School size={18} />}
          title='Ringkasan per Kelas'
          description={`${classRows.length} kelas`}
        />
      }
    >
      <Table
        rowKey='class_id'
        columns={classColumns}
        dataSource={classRows}
        loading={isSummaryLoading}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada data kelas untuk filter ini.' /> }}
      />
    </MuseCard>
  );

  const studentContent = (
    <DataListCard
      title='Ringkasan per Siswa'
      icon={<GraduationCap size={18} />}
      count={filteredStudentRows.length}
      unit='siswa'
      searchProps={{
        placeholder: "Cari nama siswa",
        value: studentSearch,
        onChange: (event) => setStudentSearch(event.target.value),
      }}
    >
      <Table
        rowKey='student_id'
        columns={studentColumns}
        dataSource={filteredStudentRows}
        loading={isSummaryLoading}
        pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: true }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                studentSearch
                  ? "Tidak ada siswa yang cocok dengan pencarian."
                  : "Belum ada data siswa untuk filter ini."
              }
            />
          ),
        }}
      />
    </DataListCard>
  );

  const tabItems = [
    { key: "target", label: "Target", icon: <BookOpenCheck />, render: () => withOverview(targetContent) },
    mode === "admin"
      ? { key: "grade", label: "Tingkat", icon: <Layers3 />, render: () => withOverview(gradeContent) }
      : null,
    mode === "admin"
      ? { key: "class", label: "Kelas", icon: <School />, render: () => withOverview(classContent) }
      : null,
    { key: "student", label: "Siswa", icon: <ChartNoAxesColumn />, render: () => withOverview(studentContent) },
  ].filter(Boolean);

  return (
    <PageTabs
      title={headerCopy.title}
      description={headerCopy.description}
      extra={headerExtra}
      items={tabItems}
    />
  );
};

export default TahfizReportContent;
