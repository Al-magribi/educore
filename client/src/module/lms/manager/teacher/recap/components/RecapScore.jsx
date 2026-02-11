import React, { useMemo, useState } from "react";
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
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  CalendarDays,
  Download,
  Filter,
  RefreshCcw,
  Users,
} from "lucide-react";
import { useGetGradingFinalQuery } from "../../../../../../service/lms/ApiGrading";
import { useGetScoreMonthlyRecapQuery } from "../../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const RecapScore = ({
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
  month,
  setMonth,
  monthOptions,
  screens,
}) => {
  const [activeView, setActiveView] = useState("monthly");

  const {
    data: monthlyRes,
    isFetching: isFetchingMonthly,
    refetch: refetchMonthly,
  } = useGetScoreMonthlyRecapQuery(
    {
      subjectId,
      classId,
      semester,
      month,
    },
    {
      skip:
        !isActive ||
        activeView !== "monthly" ||
        !subjectId ||
        !classId ||
        !semester ||
        !month,
    },
  );

  const {
    data: finalRes,
    isFetching: isFetchingFinal,
    refetch: refetchFinal,
  } = useGetGradingFinalQuery(
    {
      subjectId,
      classId,
      semester,
    },
    {
      skip:
        !isActive ||
        activeView !== "final" ||
        !subjectId ||
        !classId ||
        !semester,
    },
  );

  const monthlyData = monthlyRes?.data || {};
  const monthlyMeta = monthlyData?.meta || {};
  const monthlySummary = monthlyData?.summary || {};
  const monthlyStudents = monthlyData?.students || [];
  const monthlyRows = useMemo(
    () =>
      monthlyStudents.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        formative_count: Number(item.formative_count || 0),
        formative_average: Number(item.formative_average || 0),
        summative_count: Number(item.summative_count || 0),
        summative_written_average: Number(item.summative_written_average || 0),
        summative_skill_average: Number(item.summative_skill_average || 0),
        summative_average: Number(item.summative_average || 0),
        monthly_average: Number(item.monthly_average || 0),
      })),
    [monthlyStudents],
  );

  const finalStudents = finalRes?.data?.students || [];
  const finalRows = useMemo(
    () =>
      finalStudents.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        final_grade: Number(item.final_grade || 0),
      })),
    [finalStudents],
  );

  const kkm = Number(subject?.kkm || 75);
  const finalSummary = useMemo(() => {
    if (!finalRows.length) {
      return { average: 0, pass: 0, fail: 0 };
    }
    const total = finalRows.reduce(
      (sum, row) => sum + Number(row.final_grade || 0),
      0,
    );
    const pass = finalRows.filter(
      (row) => Number(row.final_grade || 0) >= kkm,
    ).length;
    return {
      average: round2(total / finalRows.length),
      pass,
      fail: finalRows.length - pass,
    };
  }, [finalRows, kkm]);

  const monthlyColumns = [
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
      title: "Formatif",
      children: [
        {
          title: "Jumlah",
          dataIndex: "formative_count",
          width: 92,
          align: "center",
        },
        {
          title: "Rata-rata",
          dataIndex: "formative_average",
          width: 106,
          align: "center",
          render: (value) => round2(value),
        },
      ],
    },
    {
      title: "Sumatif",
      children: [
        {
          title: "Jumlah",
          dataIndex: "summative_count",
          width: 92,
          align: "center",
        },
        {
          title: "Tulis",
          dataIndex: "summative_written_average",
          width: 100,
          align: "center",
          render: (value) => round2(value),
        },
        {
          title: "Praktik",
          dataIndex: "summative_skill_average",
          width: 100,
          align: "center",
          render: (value) => round2(value),
        },
        {
          title: "Rata-rata",
          dataIndex: "summative_average",
          width: 106,
          align: "center",
          render: (value) => round2(value),
        },
      ],
    },
    {
      title: "Nilai Bulanan",
      dataIndex: "monthly_average",
      width: 130,
      align: "center",
      render: (value) => <Tag color="blue">{round2(value)}</Tag>,
    },
  ];

  const finalColumns = [
    {
      title: "No",
      dataIndex: "no",
      width: 64,
      align: "center",
    },
    {
      title: "NIS",
      dataIndex: "nis",
      width: 130,
    },
    {
      title: "Nama Siswa",
      dataIndex: "full_name",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Nilai Akhir",
      dataIndex: "final_grade",
      width: 130,
      align: "center",
      render: (value) => round2(value),
    },
  ];

  const handleRefresh = () => {
    if (activeView === "monthly") {
      refetchMonthly();
      return;
    }
    refetchFinal();
  };

  const handleDownloadMonthlyExcel = () => {
    if (!monthlyRows.length) return;
    const rows = monthlyRows.map((row) => ({
      No: row.no,
      NIS: row.nis,
      "Nama Siswa": row.full_name,
      "Jumlah Formatif": row.formative_count,
      "Rata-rata Formatif": round2(row.formative_average),
      "Jumlah Sumatif": row.summative_count,
      "Rata-rata Tulis Sumatif": round2(row.summative_written_average),
      "Rata-rata Praktik Sumatif": round2(row.summative_skill_average),
      "Rata-rata Sumatif": round2(row.summative_average),
      "Nilai Bulanan": round2(row.monthly_average),
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 30 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Laporan Bulanan");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const selectedMonthName =
      monthOptions.find((item) => Number(item.value) === Number(month))?.label ||
      monthlyMeta.month_name ||
      "Bulan";
    const safeName =
      `Laporan_Bulanan_${selectedClassName}_${selectedMonthName}_Semester${semester}`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );

    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleDownloadFinalExcel = () => {
    if (!finalRows.length) return;
    const rows = finalRows.map((row) => ({
      No: row.no,
      NIS: row.nis,
      "Nama Siswa": row.full_name,
      "Nilai Akhir": round2(row.final_grade),
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 30 }, { wch: 14 }];

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

  const isMonthlyView = activeView === "monthly";
  const isLoadingActive = isMonthlyView ? isFetchingMonthly : isFetchingFinal;
  const hasRowsActive = isMonthlyView ? monthlyRows.length : finalRows.length;

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Rekapitulasi Nilai
            </Title>
            <Text type="secondary">
              Laporan bulanan formatif dan sumatif, serta rekap nilai akhir
              siswa.
            </Text>
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
              value={month}
              onChange={setMonth}
              style={{ minWidth: 180 }}
              options={monthOptions}
              suffixIcon={<CalendarDays size={14} />}
              disabled={!isMonthlyView}
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
            <Button icon={<RefreshCcw size={14} />} onClick={handleRefresh}>
              Refresh
            </Button>
            {isMonthlyView ? (
              <Button
                type="primary"
                icon={<Download size={14} />}
                disabled={!monthlyRows.length}
                onClick={handleDownloadMonthlyExcel}
              >
                Download Excel
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<Download size={14} />}
                disabled={!finalRows.length}
                onClick={handleDownloadFinalExcel}
              >
                Download Excel
              </Button>
            )}
          </Space>
        </Flex>

        {isMonthlyView ? (
          <Flex wrap="wrap" gap={8} style={{ marginTop: 14 }}>
            <Tag color="geekblue" icon={<Users size={12} />}>
              Total Siswa: {monthlyMeta.total_students || 0}
            </Tag>
            <Tag color="cyan">
              Avg Formatif: {round2(monthlySummary.formative_average)}
            </Tag>
            <Tag color="gold">
              Avg Sumatif: {round2(monthlySummary.summative_average)}
            </Tag>
            <Tag color="blue">
              Avg Bulanan: {round2(monthlySummary.monthly_average)}
            </Tag>
          </Flex>
        ) : (
          <Flex wrap="wrap" gap={8} style={{ marginTop: 14 }}>
            <Tag color="geekblue" icon={<Users size={12} />}>
              Total Siswa: {finalRows.length}
            </Tag>
            <Tag color="cyan">Rata-rata: {finalSummary.average}</Tag>
            <Tag color="green">Tuntas ({`>= ${kkm}`}): {finalSummary.pass}</Tag>
            <Tag color="red">Belum Tuntas: {finalSummary.fail}</Tag>
          </Flex>
        )}
      </Card>

      {!classId ? (
        <Alert
          type="info"
          showIcon
          title="Pilih kelas untuk menampilkan rekap nilai."
        />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={activeView}
            onChange={setActiveView}
            style={{ paddingInline: 16, paddingTop: 8 }}
            items={[
              { key: "monthly", label: "Laporan Bulanan" },
              { key: "final", label: "Nilai Akhir" },
            ]}
          />
          {!isLoadingActive && !hasRowsActive ? (
            <div style={{ padding: 24 }}>
              <Empty description="Belum ada data nilai pada filter ini." />
            </div>
          ) : isMonthlyView ? (
            <Table
              rowKey="key"
              dataSource={monthlyRows}
              columns={monthlyColumns}
              loading={isFetchingMonthly}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              scroll={{ x: 1240 }}
              sticky
            />
          ) : (
            <Table
              rowKey="key"
              dataSource={finalRows}
              columns={finalColumns}
              loading={isFetchingFinal}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              scroll={{ x: 760 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapScore;
