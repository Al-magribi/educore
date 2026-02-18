import React, { useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { Download, Filter, RefreshCcw, Users } from "lucide-react";
import { useGetScoreSummativeRecapQuery } from "../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const getSummativeEntryBySlot = (record, monthKey, slotKey, index) => {
  const values = record.month_scores?.[monthKey]?.summative || [];
  if (slotKey) {
    return values.find((item) => item?.slot_key === slotKey);
  }
  return values[index];
};

const buildExcelRows = (rows, monthMatrix) =>
  rows.map((row) => {
    const entry = {
      No: row.no,
      NIS: row.nis,
      "Nama Siswa": row.full_name,
    };

    for (const monthMeta of monthMatrix) {
      const monthKey = String(monthMeta.month);
      const summativeCount = Math.max(
        1,
        Number(monthMeta.max_summative_entries || 0),
      );
      const monthEntries = monthMeta.entries || [];
      for (let index = 0; index < summativeCount; index += 1) {
        const chapterTitle = monthEntries[index]?.chapter_title || "-";
        const slotKey = monthEntries[index]?.slot_key;
        const value = getSummativeEntryBySlot(row, monthKey, slotKey, index);
        entry[
          `${monthMeta.month_name} - Tertulis ${index + 1} (${chapterTitle})`
        ] = value?.score_written ?? "-";
        entry[
          `${monthMeta.month_name} - Praktik ${index + 1} (${chapterTitle})`
        ] = value?.score_skill ?? "-";
      }
    }

    entry["Nilai Sumatif"] = round2(row.final_average);
    return entry;
  });

const RecapSummative = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  classes,
  classLoading,
  classId,
  setClassId,
  semester,
  setSemester,
  isAdminView = false,
  teacherId,
  setTeacherId,
  teachers = [],
  teacherLoading = false,
  screens,
}) => {
  const {
    data: recapRes,
    isFetching,
    refetch,
  } = useGetScoreSummativeRecapQuery(
    {
      subjectId,
      classId,
      semester,
      teacherId,
    },
    {
      skip:
        !isActive ||
        !subjectId ||
        !classId ||
        !semester ||
        (isAdminView && !teacherId),
    },
  );

  const recapData = recapRes?.data || {};
  const summary = recapData?.summary || {};
  const monthMatrix = recapData?.month_matrix || [];
  const students = recapData?.students || [];

  const rows = useMemo(
    () =>
      students.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        month_scores: item.month_scores || {},
        final_average: Number(item.final_average || 0),
      })),
    [students],
  );

  const columns = useMemo(() => {
    const staticColumns = [
      {
        title: "No",
        dataIndex: "no",
        width: 64,
        align: "center",
        fixed: "left",
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 120,
        fixed: "left",
      },
      {
        title: "Nama Siswa",
        dataIndex: "full_name",
        width: 220,
        fixed: "left",
        render: (value) => <Text strong>{value}</Text>,
      },
    ];

    const monthColumns = monthMatrix.map((monthMeta) => {
      const monthKey = String(monthMeta.month);
      const summativeCount = Math.max(
        1,
        Number(monthMeta.max_summative_entries || 0),
      );
      const monthEntries = monthMeta.entries || [];
      return {
        title: monthMeta.month_name,
        key: `month-${monthKey}`,
        children: Array.from({ length: summativeCount }, (_, index) => {
          const chapterTitle = monthEntries[index]?.chapter_title || "-";
          const slotKey = monthEntries[index]?.slot_key;
          return [
            {
              title: (
                <Tooltip title={chapterTitle}>
                  <span>{`Tertulis ${index + 1}`}</span>
                </Tooltip>
              ),
              key: `${monthKey}-written-${index}`,
              width: 110,
              align: "center",
              render: (_, record) => {
                const value = getSummativeEntryBySlot(
                  record,
                  monthKey,
                  slotKey,
                  index,
                );
                return value?.score_written ?? "-";
              },
            },
            {
              title: (
                <Tooltip title={chapterTitle}>
                  <span>{`Praktik ${index + 1}`}</span>
                </Tooltip>
              ),
              key: `${monthKey}-skill-${index}`,
              width: 110,
              align: "center",
              render: (_, record) => {
                const value = getSummativeEntryBySlot(
                  record,
                  monthKey,
                  slotKey,
                  index,
                );
                return value?.score_skill ?? "-";
              },
            },
          ];
        }).flat(),
      };
    });

    const endColumns = [
      {
        title: "Nilai Sumatif",
        dataIndex: "final_average",
        width: 128,
        align: "center",
        render: (value) => <Tag color="blue">{round2(value)}</Tag>,
      },
    ];

    return [...staticColumns, ...monthColumns, ...endColumns];
  }, [monthMatrix]);

  const handleDownloadExcel = () => {
    if (!rows.length) return;
    const sheetRows = buildExcelRows(rows, monthMatrix);
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Nilai Sumatif");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Nilai_Sumatif_${selectedClassName}_Semester${semester}`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );

    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space vertical size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Rekapitulasi Sumatif
            </Title>
            <Text type="secondary">
              Rekap nilai sumatif dalam satu semester
            </Text>
          </Space>
          <Space wrap>
            <Tag color="blue">{subject?.name || "Mata Pelajaran"}</Tag>
            <Tag color="processing">
              {activePeriode?.name || recapData?.meta?.periode_name || "Periode"}
            </Tag>
          </Space>
        </Flex>

        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={12}
          style={{ marginTop: 16 }}
        >
          <Space wrap>
            <Select
              value={semester}
              onChange={setSemester}
              style={{ minWidth: 160 }}
              options={[
                { value: 1, label: "Semester 1" },
                { value: 2, label: "Semester 2" },
              ]}
              suffixIcon={<Filter size={14} />}
            />
            {isAdminView && (
              <Select
                value={teacherId}
                onChange={setTeacherId}
                style={{ minWidth: 220 }}
                placeholder="Pilih guru"
                options={teachers.map((item) => ({
                  value: item.id,
                  label: item.full_name,
                }))}
                loading={teacherLoading}
              />
            )}
            <Select
              value={classId}
              onChange={setClassId}
              style={{ minWidth: 220 }}
              placeholder="Pilih kelas"
              options={classes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              loading={classLoading}
            />
          </Space>

          <Space wrap>
            <Button icon={<RefreshCcw size={14} />} onClick={refetch}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<Download size={14} />}
              disabled={!rows.length}
              onClick={handleDownloadExcel}
            >
              Download Excel
            </Button>
          </Space>
        </Flex>

        <Flex wrap="wrap" gap={8} style={{ marginTop: 14 }}>
          <Tag color="geekblue" icon={<Users size={12} />}>
            Total Siswa: {recapData?.meta?.total_students || 0}
          </Tag>
          <Tag color="cyan">
            Avg Nilai Sumatif: {round2(summary.final_average)}
          </Tag>
        </Flex>
      </Card>

      {!classId ? (
        <Alert
          type="info"
          showIcon
          message="Pilih kelas untuk menampilkan rekap nilai."
        />
      ) : isAdminView && !teacherId ? (
        <Alert
          type="info"
          showIcon
          message="Pilih guru pengampu untuk menampilkan data yang sesuai tampilan guru."
        />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description="Belum ada data nilai pada filter ini." />
            </div>
          ) : (
            <Table
              rowKey="key"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              scroll={{ x: 2200 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapSummative;
