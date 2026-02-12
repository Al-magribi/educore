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
  Typography,
} from "antd";
import { Download, Filter, RefreshCcw, Users } from "lucide-react";
import { useGetScoreSummativeRecapQuery } from "../../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildExcelRows = (rows, monthMatrix) =>
  rows.map((row) => {
    const entry = {
      No: row.no,
      NIS: row.nis,
      "Nama Siswa": row.full_name,
    };

    for (const monthMeta of monthMatrix) {
      const monthKey = String(monthMeta.month);
      const summativeValues = row.month_scores?.[monthKey]?.summative || [];
      const summativeCount = Math.max(
        1,
        Number(monthMeta.max_summative_entries || 0),
      );

      for (let index = 0; index < summativeCount; index += 1) {
        const value = summativeValues[index] || {};
        entry[`${monthMeta.month_name} - Nilai ${index + 1} Tertulis`] =
          value.score_written ?? "-";
        entry[`${monthMeta.month_name} - Nilai ${index + 1} Praktik`] =
          value.score_skill ?? "-";
        entry[`${monthMeta.month_name} - Nilai ${index + 1} Akhir`] =
          value.final_score ?? "-";
      }
    }

    entry["Rata-rata Tertulis"] = round2(row.written_average);
    entry["Rata-rata Praktik"] = round2(row.skill_average);
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
    },
    {
      skip: !isActive || !subjectId || !classId || !semester,
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
        written_average: Number(item.written_average || 0),
        skill_average: Number(item.skill_average || 0),
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

      const summativeChildren = Array.from(
        { length: summativeCount },
        (_, index) => ({
          title: `Nilai ${index + 1}`,
          key: `${monthKey}-s-${index}`,
          children: [
            {
              title: "Tertulis",
              key: `${monthKey}-s-${index}-written`,
              width: 92,
              align: "center",
              render: (_, record) => {
                const value =
                  record.month_scores?.[monthKey]?.summative?.[index]
                    ?.score_written;
                return value ?? "-";
              },
            },
            {
              title: "Praktik",
              key: `${monthKey}-s-${index}-skill`,
              width: 92,
              align: "center",
              render: (_, record) => {
                const value =
                  record.month_scores?.[monthKey]?.summative?.[index]
                    ?.score_skill;
                return value ?? "-";
              },
            },
            {
              title: "Akhir",
              key: `${monthKey}-s-${index}-final`,
              width: 92,
              align: "center",
              render: (_, record) => {
                const value =
                  record.month_scores?.[monthKey]?.summative?.[index]
                    ?.final_score;
                return value ?? "-";
              },
            },
          ],
        }),
      );

      return {
        title: monthMeta.month_name,
        key: `month-${monthKey}`,
        children: summativeChildren,
      };
    });

    const endColumns = [
      {
        title: "Rata-rata Tertulis",
        dataIndex: "written_average",
        width: 140,
        align: "center",
        render: (value) => <Tag>{round2(value)}</Tag>,
      },
      {
        title: "Rata-rata Praktik",
        dataIndex: "skill_average",
        width: 140,
        align: "center",
        render: (value) => <Tag>{round2(value)}</Tag>,
      },
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
            <Text type="secondary">Rekap nilai sumatif dalam satu semester</Text>
          </Space>
          <Space wrap>
            <Tag color="blue">{subject?.name || "Mata Pelajaran"}</Tag>
            <Tag color="processing">{activePeriode?.name || "Periode"}</Tag>
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
