import { useMemo, useState } from "react";
import { Alert, Empty, Flex, Grid, Input, Select, Skeleton, Table, Tag, Typography } from "antd";
import { BookOpenCheck, Users } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard, StatCard } from "../../../components/ui/muse";
import { useGetMusyrifHalaqohListQuery } from "../../../service/tahfiz/ApiHalaqoh";

const { useBreakpoint } = Grid;
const { Text } = Typography;

const MusyrifHalaqoh = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [periodeId, setPeriodeId] = useState();
  const [halaqohId, setHalaqohId] = useState();
  const [studentSearchByHalaqoh, setStudentSearchByHalaqoh] = useState({});

  const { data, isLoading, isFetching, isError, error } =
    useGetMusyrifHalaqohListQuery({
      periode_id: periodeId,
    });

  const selectedPeriodeId =
    periodeId ?? data?.filters?.selected_periode_id ?? undefined;

  const periodeOptions = (data?.filters?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));
  const halaqohOptions = (data?.halaqoh || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const halaqohRows = useMemo(() => {
    const rows = data?.halaqoh || [];
    return rows.filter((halaqoh) => (halaqohId ? halaqoh.id === halaqohId : true));
  }, [data?.halaqoh, halaqohId]);

  const totalUniqueStudents = useMemo(() => {
    const studentMap = new Map();
    halaqohRows.forEach((halaqoh) => {
      (halaqoh.students || []).forEach((student) => {
        if (!student?.id) return;
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, student);
        }
      });
    });
    return studentMap.size;
  }, [halaqohRows]);

  const columns = [
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
    {
      title: "KELAS",
      dataIndex: "class_name",
      width: 170,
      render: (value) => value || "-",
    },
  ];

  const gap = isMobile ? 16 : 24;

  const renderHalaqohCard = (halaqoh) => {
    const keyword = String(studentSearchByHalaqoh[halaqoh.id] || "").trim().toLowerCase();
    const studentRows = keyword
      ? (halaqoh.students || []).filter((student) =>
          String(student.full_name || "").toLowerCase().includes(keyword),
        )
      : halaqoh.students || [];

    return (
      <MuseCard
        key={halaqoh.id}
        flush
        title={
          <CardTitle
            icon={<BookOpenCheck size={18} />}
            title={halaqoh.name}
            description={`${Number(halaqoh.student_count || 0)} siswa`}
          />
        }
        extra={
          <Flex gap={8} align='center' wrap style={{ padding: "8px 0", justifyContent: "flex-end" }}>
            <Tag color={halaqoh.is_active ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
              {halaqoh.is_active ? "Aktif" : "Nonaktif"}
            </Tag>
            <Input.Search
              allowClear
              aria-label={`Cari siswa di ${halaqoh.name}`}
              placeholder='Cari nama siswa'
              style={{ width: isMobile ? "100%" : 240 }}
              value={studentSearchByHalaqoh[halaqoh.id] || ""}
              onChange={(event) =>
                setStudentSearchByHalaqoh((prev) => ({
                  ...prev,
                  [halaqoh.id]: event.target.value,
                }))
              }
            />
          </Flex>
        }
        styles={isMobile ? { header: { flexWrap: "wrap", paddingBlock: 8 } } : undefined}
      >
        <Table
          rowKey='id'
          columns={columns}
          dataSource={studentRows}
          pagination={false}
          size={isMobile ? "small" : "middle"}
          scroll={{ x: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={keyword ? "Tidak ada siswa yang cocok." : "Belum ada siswa di halaqoh ini."}
              />
            ),
          }}
        />
      </MuseCard>
    );
  };

  return (
    <Flex vertical gap={gap} style={{ minWidth: 0 }}>
      <PageHeader
        title='Halaqoh Saya'
        description='Daftar halaqoh dan siswa binaan Anda. Satu musyrif bisa menangani lebih dari satu halaqoh.'
        extra={
          <>
            <Select
              aria-label='Pilih periode'
              value={selectedPeriodeId}
              options={periodeOptions}
              onChange={setPeriodeId}
              placeholder='Pilih periode'
              style={{ width: isMobile ? "100%" : 220 }}
              loading={isFetching}
            />
            <Select
              aria-label='Filter halaqoh'
              allowClear
              value={halaqohId}
              options={halaqohOptions}
              onChange={setHalaqohId}
              placeholder='Semua halaqoh'
              style={{ width: isMobile ? "100%" : 200 }}
              loading={isFetching}
            />
          </>
        }
      />

      {isError ? (
        <Alert
          type='error'
          showIcon
          title='Gagal memuat halaqoh musyrif'
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
        <StatCard title='Total Halaqoh' value={halaqohRows.length} icon={<BookOpenCheck size={24} />} />
        <StatCard
          title='Total Siswa Binaan'
          value={totalUniqueStudents}
          icon={<Users size={24} />}
          tone='success'
        />
      </div>

      {isLoading ? (
        <MuseCard>
          <Skeleton active paragraph={{ rows: 5 }} />
        </MuseCard>
      ) : halaqohRows.length ? (
        halaqohRows.map(renderHalaqohCard)
      ) : (
        <MuseCard>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='Belum ada halaqoh untuk periode ini. Hubungi admin tahfiz untuk penempatan.'
          />
        </MuseCard>
      )}
    </Flex>
  );
};

export default MusyrifHalaqoh;
