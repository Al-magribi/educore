import { useMemo, useState } from "react";
import { Alert, Flex, Grid, Select, Skeleton, Table, Tag, Typography } from "antd";
import {
  Activity,
  Award,
  BookOpenCheck,
  CalendarClock,
  CircleUserRound,
  GraduationCap,
  NotebookPen,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { useGetStudentSummaryQuery } from "../../../service/tahfiz/ApiDashboard";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const statGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 24,
};

const TahfizDashboard = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
  const [selectedPeriodeId, setSelectedPeriodeId] = useState();

  const queryArg = useMemo(
    () => ({ homebase_id: selectedHomebaseId, periode_id: selectedPeriodeId }),
    [selectedHomebaseId, selectedPeriodeId],
  );

  const { data, isLoading, isError, error, isFetching } =
    useGetStudentSummaryQuery(queryArg);

  const filters = data?.filters;
  const selectedHomebaseValue = selectedHomebaseId ?? filters?.selected_homebase_id;
  const selectedPeriodeValue = selectedPeriodeId ?? filters?.selected_periode_id;
  const isActivePeriode =
    filters?.active_periode_id && filters.active_periode_id === filters?.selected_periode_id;

  const homebaseOptions = (filters?.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const periodeOptions = (filters?.periodes || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const overview = data?.overview || {};
  const statItems = [
    { title: "Total Siswa", value: overview.total_students || 0, icon: <GraduationCap size={24} />, tone: "primary" },
    { title: "Halaqoh Aktif", value: overview.total_halaqoh || 0, icon: <BookOpenCheck size={24} />, tone: "success" },
    { title: "Musyrif", value: overview.total_musyrif || 0, icon: <CircleUserRound size={24} />, tone: "cyan" },
    { title: "Total Setoran", value: overview.total_setoran || 0, icon: <NotebookPen size={24} />, tone: "accent" },
    { title: "Ujian Tahfiz", value: overview.total_ujian || 0, icon: <CalendarClock size={24} />, tone: "purple" },
    {
      title: "Rata-rata Ujian",
      value: Number(overview.average_exam_score || 0).toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      }),
      icon: <Award size={24} />,
      tone: "warning",
    },
  ];

  const filterControls = (
    <>
      <Select
        aria-label='Pilih homebase'
        value={selectedHomebaseValue}
        options={homebaseOptions}
        onChange={(value) => {
          setSelectedHomebaseId(value);
          setSelectedPeriodeId(undefined);
        }}
        placeholder='Pilih homebase'
        style={{ width: isMobile ? "100%" : 220 }}
        loading={isFetching}
        disabled={!homebaseOptions.length}
      />
      <Select
        aria-label='Pilih periode'
        value={selectedPeriodeValue}
        options={periodeOptions}
        onChange={setSelectedPeriodeId}
        placeholder='Pilih periode'
        style={{ width: isMobile ? "100%" : 200 }}
        loading={isFetching}
        disabled={!periodeOptions.length}
      />
    </>
  );

  const columns = [
    {
      title: "JENIS AKTIVITAS",
      dataIndex: "activity_type",
      key: "activity_type",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "TOTAL SETORAN",
      dataIndex: "total_setoran",
      key: "total_setoran",
      align: "right",
      width: 160,
      render: (val) => Number(val || 0).toLocaleString("id-ID"),
    },
    {
      title: "TOTAL BARIS",
      dataIndex: "total_lines",
      key: "total_lines",
      align: "right",
      width: 160,
      render: (val) => Number(val || 0).toLocaleString("id-ID"),
    },
  ];

  return (
    <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
      <PageHeader
        title='Dashboard Tahfiz'
        description='Ringkasan performa hafalan siswa berdasarkan homebase dan periode.'
        extra={filterControls}
        meta={
          data ? (
            <Tag color={isActivePeriode ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
              {isActivePeriode ? "Periode aktif" : "Periode nonaktif"}
            </Tag>
          ) : null
        }
      />

      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat dashboard Tahfiz'
          description={error?.data?.message || "Periksa koneksi lalu muat ulang halaman."}
        />
      ) : null}

      {isLoading ? (
        <div style={statGridStyle}>
          {statItems.map((item) => (
            <MuseCard key={item.title}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </MuseCard>
          ))}
        </div>
      ) : (
        <div style={{ ...statGridStyle, gap: isMobile ? 16 : 24 }}>
          {statItems.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>
      )}

      <MuseCard
        flush
        title={
          <CardTitle
            icon={<Activity size={18} />}
            title='Ringkasan Aktivitas Tahfiz'
            description='Jumlah setoran dan baris hafalan per jenis aktivitas.'
          />
        }
      >
        <Table
          dataSource={data?.activity_summary || []}
          rowKey={(record) => record.activity_type}
          pagination={false}
          scroll={{ x: true }}
          loading={isFetching}
          columns={columns}
          locale={{ emptyText: "Belum ada aktivitas setoran pada periode ini." }}
        />
      </MuseCard>
    </Flex>
  );
};

export default TahfizDashboard;
