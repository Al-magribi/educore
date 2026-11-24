import { useMemo, useState } from "react";
import { Alert, Empty, Flex, Grid, Progress, Select, Skeleton, Table, Tag, Typography, theme } from "antd";
import { BookOpenCheck, ChartNoAxesColumn, CheckCircle2, CircleGauge, Users } from "lucide-react";

import { CardTitle, MuseCard, PageTabs, StatCard } from "../../../components/ui/muse";
import { DataListCard } from "../../../components/ui/muse/DataSection";
import { museRadius } from "../../../config/theme";
import { useGetMusyrifReportSummaryQuery } from "../../../service/tahfiz/ApiReport";

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
  if (item.target_type === "juz") return `Juz ${item.juz_number ?? "-"}`;

  if (item.start_ayat && item.end_ayat) {
    return `${item.surah_number}. ${item.surah_name_latin} (${item.start_ayat}-${item.end_ayat})`;
  }

  return `${item.surah_number}. ${item.surah_name_latin}`;
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
          <Text style={{ display: "block" }}>{record.class_name || "-"}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.grade_name || "-"}
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
    {
      title: "CAPAIAN",
      dataIndex: "completion_percentage",
      width: 240,
      render: (value) => (
        <Progress
          percent={toPercent(value)}
          status={getProgressStatus(value)}
          size='small'
          format={() => renderPercent(value)}
          style={{ minWidth: 160, margin: 0 }}
        />
      ),
    },
  ];

  const gap = isMobile ? 16 : 24;

  const targetTabContent = (
    <MuseCard
      title={
        <CardTitle
          icon={<BookOpenCheck size={18} />}
          title='Target Aktif yang Digunakan'
          description={`${plans.length} target`}
        />
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : plans.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {plans.map((plan) => (
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
                {plan.grade_name} · {plan.target_total_ayahs || 0} ayat target
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
          description='Belum ada target aktif untuk filter ini.'
        />
      )}
    </MuseCard>
  );

  const reportTabContent = (
    <DataListCard
      title='Rekap Capaian Siswa'
      description='Dihitung dari setoran ziyadah'
      icon={<ChartNoAxesColumn size={18} />}
      count={filteredStudentRows.length}
      unit='siswa'
      searchProps={{
        placeholder: "Cari nama, NIS, atau kelas",
        value: studentSearch,
        onChange: (event) => setStudentSearch(event.target.value),
      }}
    >
      <Table
        rowKey='student_id'
        columns={studentColumns}
        dataSource={filteredStudentRows}
        loading={isLoading || isFetching}
        pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: true }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                studentSearch
                  ? "Tidak ada siswa yang cocok dengan pencarian."
                  : "Belum ada data capaian siswa."
              }
            />
          ),
        }}
      />
    </DataListCard>
  );

  const withOverview = (section) => (
    <Flex vertical gap={gap}>
      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat laporan musyrif'
          description={error?.data?.message || "Silakan coba lagi."}
        />
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap,
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
      {section}
    </Flex>
  );

  return (
    <PageTabs
      title='Laporan Musyrif'
      description='Rekap capaian target hafalan siswa di halaqoh binaan Anda.'
      extra={
        <>
          <Select
            aria-label='Pilih periode'
            value={selectedPeriodeId}
            options={periodeOptions}
            onChange={(value) => {
              setPeriodeId(value);
              setHalaqohId(undefined);
            }}
            placeholder='Pilih periode'
            loading={isFetching}
            style={{ width: isMobile ? "100%" : 220 }}
          />
          <Select
            aria-label='Filter halaqoh'
            allowClear
            value={selectedHalaqohId}
            options={halaqohOptions}
            onChange={setHalaqohId}
            placeholder='Semua halaqoh'
            loading={isFetching}
            style={{ width: isMobile ? "100%" : 200 }}
          />
        </>
      }
      items={[
        {
          key: "target",
          label: "Target",
          icon: <BookOpenCheck />,
          render: () => withOverview(targetTabContent),
        },
        {
          key: "capaian",
          label: "Laporan Capaian",
          icon: <ChartNoAxesColumn />,
          render: () => withOverview(reportTabContent),
        },
      ]}
    />
  );
};

export default MusyrifReport;
