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
import { useGetFinalScoreRecapQuery } from "../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildExcelRows = (rows) =>
  rows.map((row) => ({
    No: row.no,
    NIS: row.nis,
    "Nama Siswa": row.full_name,
    "Nilai Akhir": row.final_grade ?? "-",
  }));

const FinalScore = ({
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
  } = useGetFinalScoreRecapQuery(
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
        final_grade:
          item.final_grade === null || item.final_grade === undefined
            ? null
            : Number(item.final_grade),
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
        width: 240,
        fixed: "left",
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Nilai Akhir",
        dataIndex: "final_grade",
        width: 140,
        align: "center",
        render: (value) =>
          value === null || value === undefined ? (
            "-"
          ) : (
            <Tag color="blue">{round2(value)}</Tag>
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
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Nilai Akhir");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Nilai_Akhir_${selectedClassName}_Semester${semester}`.replace(
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
              Rekapitulasi Nilai Akhir
            </Title>
            <Text type="secondary">
              Rekap nilai akhir siswa dalam satu semester
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
            Avg Nilai Akhir: {round2(summary.final_average)}
          </Tag>
          <Tag color="purple">
            Sudah Dinilai: {summary.total_graded || 0}
          </Tag>
        </Flex>
      </Card>

      {!classId ? (
        <Alert
          type="info"
          showIcon
          message="Pilih kelas untuk menampilkan rekap nilai akhir."
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
              <Empty description="Belum ada data nilai akhir pada filter ini." />
            </div>
          ) : (
            <Table
              rowKey="key"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              scroll={{ x: 1200 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default FinalScore;
