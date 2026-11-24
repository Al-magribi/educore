import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Grid,
  List,
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
  Download,
  FileText,
  GraduationCap,
  ScrollText,
  Users,
} from "lucide-react";

import { CardTitle, IconBox, MuseCard, PageTabs, StatCard } from "../../../components/ui/muse";
import { museRadius } from "../../../config/theme";
import { useGetTahfizPersonalSummaryQuery } from "../../../service/tahfiz/ApiReport";

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

const EMPTY_LIST = [];

const TahfizPersonalReportContent = ({ mode = "student" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const { data, isLoading, isFetching, isError, error } = useGetTahfizPersonalSummaryQuery();

  const reports = data?.students || EMPTY_LIST;
  const overview = data?.overview || {};
  const [selectedStudentId, setSelectedStudentId] = useState();

  // Siswa aktif diturunkan dari data: pilihan user bila masih ada, kalau tidak siswa pertama.
  const activeReport = useMemo(
    () =>
      reports.find((item) => item.student?.student_id === selectedStudentId) ||
      reports[0] ||
      null,
    [reports, selectedStudentId],
  );
  const activeStudentId = activeReport?.student?.student_id;

  const student = useMemo(() => activeReport?.student || {}, [activeReport]);
  const planRows = activeReport?.student_rows || EMPTY_LIST;
  const plans = activeReport?.plans || EMPTY_LIST;
  const recentRecords = activeReport?.recent_records || EMPTY_LIST;
  const isBusy = isLoading || isFetching;

  const headerCopy =
    mode === "parent"
      ? {
          title: "Laporan Tahfiz Anak",
          description: "Pantau target, capaian hafalan, dan riwayat setoran anak Anda.",
        }
      : {
          title: "Laporan Tahfiz Saya",
          description: "Lihat target aktif, progres capaian, dan riwayat setoran terakhirmu.",
        };

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

  const activeOverview = activeReport?.overview || {};
  const summaryCards =
    mode === "parent"
      ? [
          { title: "Anak Terhubung", value: overview.students_total || 0, icon: <Users size={24} />, tone: "primary" },
          { title: "Plan Aktif", value: overview.active_plan_count || 0, icon: <BookOpenCheck size={24} />, tone: "accent" },
          {
            title: "Rata-rata Capaian",
            value: renderPercent(overview.average_completion_percentage || 0),
            icon: <ChartNoAxesColumn size={24} />,
            tone: "warning",
          },
          { title: "Total Setoran", value: overview.total_records || 0, icon: <ScrollText size={24} />, tone: "success" },
        ]
      : [
          { title: "Plan Aktif", value: activeOverview.active_plan_count || 0, icon: <BookOpenCheck size={24} />, tone: "accent" },
          {
            title: "Rata-rata Capaian",
            value: renderPercent(activeOverview.average_completion_percentage || 0),
            icon: <ChartNoAxesColumn size={24} />,
            tone: "warning",
          },
          { title: "Total Setoran", value: activeOverview.total_records || 0, icon: <ScrollText size={24} />, tone: "primary" },
          { title: "Setoran Ziyadah", value: activeOverview.ziyadah_records || 0, icon: <CheckCircle2 size={24} />, tone: "success" },
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

  const planColumns = [
    {
      title: "TARGET",
      dataIndex: "plan_title",
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "AYAT",
      key: "achievement",
      width: 160,
      align: "right",
      render: (_, record) => `${record.achieved_ayahs} / ${record.target_total_ayahs}`,
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

  const recordColumns = [
    { title: "TANGGAL", dataIndex: "date", width: 130, render: (value) => formatDate(value) },
    {
      title: "AKTIVITAS",
      dataIndex: "activity_name",
      width: 140,
      render: (value, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {value || "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.activity_code || "-"}
          </Text>
        </div>
      ),
    },
    { title: "RENTANG SETORAN", key: "range", render: (_, record) => rangeLabel(record) },
    {
      title: "PENILAIAN",
      key: "grade",
      width: 160,
      render: (_, record) => (
        <div>
          <Text style={{ display: "block" }}>Kelancaran: {record.fluency_grade || "-"}</Text>
          <Text>Tajwid: {record.tajweed_grade || "-"}</Text>
        </div>
      ),
    },
    {
      title: "PENCATAT",
      key: "recorder",
      width: 170,
      render: (_, record) => (
        <div>
          <Text style={{ display: "block" }}>{record.recorded_by_name || "-"}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.recorded_by_role || "-"}
          </Text>
        </div>
      ),
    },
  ];

  const emptyStudent = (
    <MuseCard>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          mode === "parent"
            ? "Belum ada data anak yang terhubung ke akun ini. Hubungi admin sekolah bila data belum muncul."
            : "Belum ada data tahfiz untuk akunmu. Hubungi musyrif atau admin bila data belum muncul."
        }
      />
    </MuseCard>
  );

  const identityCard = activeReport ? (
    <MuseCard>
      <Flex justify='space-between' align={isMobile ? "flex-start" : "center"} gap={16} wrap>
        <Flex align='center' gap={12} style={{ minWidth: 0 }}>
          <IconBox icon={<GraduationCap size={24} />} />
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ display: "block", fontSize: 16 }}>
              {student.student_name || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              NIS {student.nis || "-"} · {student.class_name || "-"} · {student.grade_name || "-"}
            </Text>
          </div>
        </Flex>
        <Flex gap={6} wrap>
          <Tag style={{ marginInlineEnd: 0 }}>{student.homebase_name || "Sekolah"}</Tag>
          <Tag style={{ marginInlineEnd: 0 }}>{student.periode_name || "Periode belum aktif"}</Tag>
          <Tag color='processing' style={{ marginInlineEnd: 0 }}>
            Setoran terakhir: {formatDate(activeOverview.last_record_date)}
          </Tag>
        </Flex>
      </Flex>
    </MuseCard>
  ) : null;

  const statGrid = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: isMobile ? 16 : 24,
      }}
    >
      {summaryCards.map((item) =>
        isLoading ? (
          <MuseCard key={item.title}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </MuseCard>
        ) : (
          <StatCard key={item.title} {...item} />
        ),
      )}
    </div>
  );

  const summaryContent = (
    <MuseCard
      flush
      title={
        <CardTitle
          icon={<ChartNoAxesColumn size={18} />}
          title='Capaian per Target'
          description={`${planRows.length} target`}
        />
      }
    >
      <Table
        rowKey={(record) => `${record.student_id}-${record.plan_id}`}
        columns={planColumns}
        dataSource={planRows}
        loading={isBusy}
        pagination={false}
        scroll={{ x: true }}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada target aktif.' />
          ),
        }}
      />
    </MuseCard>
  );

  const targetContent = (
    <MuseCard
      title={
        <CardTitle
          icon={<BookOpenCheck size={18} />}
          title='Detail Target Aktif'
          description={`${plans.length} target`}
        />
      }
    >
      {plans.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {plans.map((plan) => {
            const completion =
              planRows.find((item) => item.plan_id === plan.plan_id)?.completion_percentage || 0;
            return (
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
                  {plan.grade_name || "-"} · {plan.target_total_ayahs || 0} ayat target
                </Text>
                <div style={{ marginTop: 8 }}>{renderProgress(completion)}</div>
                <Flex gap={6} wrap style={{ marginTop: 8 }}>
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
                {plan.notes ? (
                  <Text type='secondary' style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                    {plan.notes}
                  </Text>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='Belum ada target aktif untuk siswa ini.'
        />
      )}
    </MuseCard>
  );

  const historyContent = (
    <MuseCard
      flush
      title={
        <CardTitle
          icon={<FileText size={18} />}
          title='Riwayat Setoran Terbaru'
          description={`${recentRecords.length} entri`}
        />
      }
    >
      {isMobile ? (
        <List
          loading={isBusy}
          dataSource={recentRecords}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada riwayat setoran.' />
            ),
          }}
          pagination={
            recentRecords.length > 8 ? { pageSize: 8, size: "small", align: "center" } : false
          }
          style={{ padding: "0 12px 12px" }}
          renderItem={(record) => (
            <div
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: museRadius.item,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Flex justify='space-between' gap={8}>
                <Text strong>{record.activity_name || "-"}</Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {formatDate(record.date)}
                </Text>
              </Flex>
              <Text style={{ display: "block", marginTop: 4 }}>{rangeLabel(record)}</Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                Kelancaran {record.fluency_grade || "-"} · Tajwid {record.tajweed_grade || "-"} ·{" "}
                {record.recorded_by_name || "-"}
              </Text>
            </div>
          )}
        />
      ) : (
        <Table
          rowKey='id'
          columns={recordColumns}
          dataSource={recentRecords}
          loading={isBusy}
          pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
          scroll={{ x: true }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada riwayat setoran.' />
            ),
          }}
        />
      )}
    </MuseCard>
  );

  const withContext = (section) => (
    <Flex vertical gap={isMobile ? 16 : 24}>
      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat laporan tahfiz'
          description={error?.data?.message || "Periksa koneksi lalu muat ulang halaman."}
        />
      ) : null}
      {isLoading ? (
        <MuseCard>
          <Skeleton active avatar paragraph={{ rows: 1 }} />
        </MuseCard>
      ) : (
        identityCard
      )}
      {statGrid}
      {!isLoading && !activeReport && !isError ? emptyStudent : section}
    </Flex>
  );

  return (
    <PageTabs
      title={headerCopy.title}
      description={headerCopy.description}
      extra={
        <>
          {mode === "parent" && reports.length > 1 ? (
            <Select
              aria-label='Pilih anak'
              value={activeStudentId}
              onChange={setSelectedStudentId}
              options={studentOptions}
              style={{ width: isMobile ? "100%" : 220 }}
              placeholder='Pilih anak'
            />
          ) : null}
          <Button
            icon={<Download size={16} />}
            onClick={handleExportExcel}
            disabled={!activeReport || isBusy}
            block={isMobile}
          >
            Unduh Excel
          </Button>
        </>
      }
      items={[
        { key: "summary", label: "Ringkasan", icon: <ChartNoAxesColumn />, render: () => withContext(summaryContent) },
        { key: "target", label: "Target", icon: <BookOpenCheck />, render: () => withContext(targetContent) },
        { key: "history", label: "Riwayat", icon: <FileText />, render: () => withContext(historyContent) },
      ]}
    />
  );
};

export default TahfizPersonalReportContent;
