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
import { useGetReportScoreRecapQuery } from "../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildExcelRows = (rows) =>
  rows.map((row) => ({
    No: row.no,
    NIS: row.nis,
    "Nama Siswa": row.full_name,
    "Rata-rata Sumatif": row.summative_average ?? "-",
    "Nilai Akhir": row.final_grade ?? "-",
    "Nilai Raport": row.report_grade ?? "-",
  }));

const NilaiRaport = ({
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
  } = useGetReportScoreRecapQuery(
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
  const students = recapData?.students || [];

  const rows = useMemo(
    () =>
      students.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        summative_average:
          item.summative_average === null || item.summative_average === undefined
            ? null
            : Number(item.summative_average),
        final_grade:
          item.final_grade === null || item.final_grade === undefined
            ? null
            : Number(item.final_grade),
        report_grade:
          item.report_grade === null || item.report_grade === undefined
            ? null
            : Number(item.report_grade),
      })),
    [students],
  );

  const columns = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "no",
        width: 64,
        align: "center",
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 120,
      },
      {
        title: "Nama Siswa",
        dataIndex: "full_name",
        ellipsis: true,
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Rata-rata Sumatif",
        dataIndex: "summative_average",
        width: 150,
        align: "center",
        render: (value) =>
          value === null || value === undefined ? (
            "-"
          ) : (
            <Tag color="cyan">{round2(value)}</Tag>
          ),
      },
      {
        title: "Nilai Akhir",
        dataIndex: "final_grade",
        width: 130,
        align: "center",
        render: (value) =>
          value === null || value === undefined ? (
            "-"
          ) : (
            <Tag color="blue">{round2(value)}</Tag>
          ),
      },
      {
        title: "Nilai Raport",
        dataIndex: "report_grade",
        width: 130,
        align: "center",
        render: (value) =>
          value === null || value === undefined ? (
            "-"
          ) : (
            <Tag color="green">{round2(value)}</Tag>
          ),
      },
    ],
    [],
  );

  const handleDownloadExcel = () => {
    if (!rows.length) return;
    const sheetRows = buildExcelRows(rows);
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Nilai Raport");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Nilai_Raport_${selectedClassName}_Semester${semester}`.replace(
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
              Rekapitulasi Nilai Raport
            </Title>
            <Text type="secondary">
              Nilai raport = rata-rata dari nilai sumatif dan nilai akhir
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
            Avg Sumatif: {round2(summary.summative_average)}
          </Tag>
          <Tag color="blue">
            Avg Nilai Akhir: {round2(summary.final_average)}
          </Tag>
          <Tag color="green">
            Avg Nilai Raport: {round2(summary.report_average)}
          </Tag>
        </Flex>
      </Card>

      {!classId ? (
        <Alert
          type="info"
          showIcon
          message="Pilih kelas untuk menampilkan rekap nilai raport."
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
              <Empty description="Belum ada data nilai raport pada filter ini." />
            </div>
          ) : (
            <Table
              rowKey="key"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              tableLayout="fixed"
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default NilaiRaport;
