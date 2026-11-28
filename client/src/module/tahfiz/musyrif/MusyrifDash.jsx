import { useMemo, useState } from "react";
import { Alert, Col, Empty, Flex, Grid, Row, Select, Skeleton, Table, Tag, Typography } from "antd";
import { BookOpenCheck, CalendarClock, NotebookPen, Users } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { DataListCard, DataRow } from "../../../components/ui/muse/DataSection";
import { useGetMusyrifSummaryQuery } from "../../../service/tahfiz/ApiDashboard";

const { Text } = Typography;
const { useBreakpoint } = Grid;

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

  const overview = data?.overview || {};
  const isActivePeriode =
    data?.filters?.active_periode_id &&
    data?.filters?.active_periode_id === data?.filters?.selected_periode_id;

  const statItems = [
    { title: "Halaqoh Diampu", value: overview.total_halaqoh || 0, icon: <BookOpenCheck size={24} />, tone: "primary" },
    { title: "Siswa Binaan", value: overview.total_students || 0, icon: <Users size={24} />, tone: "success" },
    { title: "Total Setoran", value: overview.total_setoran || 0, icon: <NotebookPen size={24} />, tone: "accent" },
    { title: "Total Baris", value: overview.total_lines || 0, icon: <CalendarClock size={24} />, tone: "purple" },
  ];

  const formatNumber = (value) => Number(value || 0).toLocaleString("id-ID");

  const activityColumns = [
    {
      title: "JENIS AKTIVITAS",
      dataIndex: "activity_type",
      render: (value) => <Text strong>{value}</Text>,
    },
    { title: "SETORAN", dataIndex: "total_setoran", width: 120, align: "right", render: formatNumber },
    { title: "BARIS", dataIndex: "total_lines", width: 120, align: "right", render: formatNumber },
  ];

  const studentColumns = [
    {
      title: "SISWA",
      key: "student",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.full_name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            NIS {record.nis || "-"}
          </Text>
        </div>
      ),
    },
    { title: "KELAS", dataIndex: "class_name", width: 140, render: (value) => value || "-" },
    { title: "HALAQOH", dataIndex: "halaqoh_name", width: 180, render: (value) => value || "-" },
    { title: "SETORAN", dataIndex: "total_setoran", width: 110, align: "right", render: formatNumber },
    { title: "BARIS", dataIndex: "total_lines", width: 110, align: "right", render: formatNumber },
    { title: "TERAKHIR", dataIndex: "last_setoran_date", width: 140, render: (value) => formatDate(value) },
  ];

  const gap = isMobile ? 16 : 24;

  return (
    <Flex vertical gap={gap} style={{ minWidth: 0 }}>
      <PageHeader
        title={data?.musyrif?.full_name ? `Assalamu'alaikum, ${data.musyrif.full_name}` : "Dashboard Musyrif"}
        description='Pantau halaqoh, setoran, dan progres siswa binaan Anda.'
        extra={
          <Select
            aria-label='Pilih periode'
            value={selectedPeriodeId}
            options={periodeOptions}
            onChange={setPeriodeId}
            placeholder='Pilih periode'
            loading={isFetching}
            style={{ width: isMobile ? "100%" : 220 }}
          />
        }
        meta={
          data ? (
            <Flex gap={6} wrap>
              {data?.musyrif?.homebase_name ? (
                <Tag style={{ marginInlineEnd: 0 }}>{data.musyrif.homebase_name}</Tag>
              ) : null}
              <Tag color={isActivePeriode ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
                {isActivePeriode ? "Periode aktif" : "Periode arsip"}
              </Tag>
            </Flex>
          ) : null
        }
      />

      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat dashboard musyrif'
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
        {statItems.map((item) =>
          isLoading ? (
            <MuseCard key={item.title}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </MuseCard>
          ) : (
            <StatCard key={item.title} {...item} />
          ),
        )}
      </div>

      <Row gutter={[gap, gap]}>
        <Col xs={24} xl={10}>
          <MuseCard
            flush
            style={{ height: "100%" }}
            title={
              <CardTitle
                icon={<BookOpenCheck size={18} />}
                title='Halaqoh Binaan'
                description={`${data?.halaqoh_summary?.length || 0} halaqoh`}
              />
            }
          >
            {isLoading ? (
              <div style={{ padding: 16 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </div>
            ) : data?.halaqoh_summary?.length ? (
              data.halaqoh_summary.map((item, index) => (
                <DataRow
                  key={item.id}
                  icon={<BookOpenCheck size={18} />}
                  title={item.name}
                  subtitle={`${Number(item.student_count || 0)} siswa`}
                  tags={
                    <Tag color={item.is_active ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Tag>
                  }
                  last={index === data.halaqoh_summary.length - 1}
                />
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description='Belum ada halaqoh pada periode ini. Hubungi admin tahfiz untuk penempatan.'
                style={{ padding: 24 }}
              />
            )}
          </MuseCard>
        </Col>

        <Col xs={24} xl={14}>
          <MuseCard
            flush
            style={{ height: "100%" }}
            title={<CardTitle icon={<NotebookPen size={18} />} title='Ringkasan Aktivitas' />}
          >
            <Table
              rowKey={(record) => record.activity_type}
              columns={activityColumns}
              dataSource={data?.activity_summary || []}
              pagination={false}
              loading={isFetching}
              scroll={{ x: true }}
              locale={{ emptyText: "Belum ada aktivitas setoran pada periode ini." }}
            />
          </MuseCard>
        </Col>
      </Row>

      <DataListCard
        title='Rekap Siswa Binaan'
        description='Urut dari setoran terbanyak'
        icon={<Users size={18} />}
        count={filteredStudentRows.length}
        unit='siswa'
        searchProps={{
          placeholder: "Cari siswa, NIS, atau halaqoh",
          value: studentSearch,
          onChange: (event) => setStudentSearch(event.target.value),
        }}
      >
        <Table
          rowKey='student_id'
          columns={studentColumns}
          dataSource={filteredStudentRows}
          loading={isFetching}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          scroll={{ x: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  studentSearch
                    ? "Tidak ada siswa yang cocok dengan pencarian."
                    : "Belum ada siswa binaan pada periode ini."
                }
              />
            ),
          }}
        />
      </DataListCard>
    </Flex>
  );
};

export default MusyrifDash;
