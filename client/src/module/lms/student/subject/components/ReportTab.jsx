import React, { useEffect, useMemo, useState } from "react";
import { Alert, Card, Col, Empty, Flex, Grid, Row, Tag } from "antd";
import { useGetStudentSubjectReportQuery } from "../../../../../service/lms/ApiRecap";
import AttendanceSection from "./report/AttendanceSection";
import AttitudeSection from "./report/AttitudeSection";
import { MONTH_OPTIONS, SEMESTER_MONTHS } from "./report/constants";
import ReportHeader from "./report/ReportHeader";
import ReportSummaryCards from "./report/ReportSummaryCards";
import ScoreSectionCard from "./report/ScoreSectionCard";
import { formatDateDisplay } from "./report/utils";

const { useBreakpoint } = Grid;

const ReportTab = ({ subject, classId }) => {
  const screens = useBreakpoint();
  const now = new Date();
  const initialMonth = now.getMonth() + 1;
  const initialSemester = initialMonth >= 7 ? 1 : 2;

  const [selectedSemester, setSelectedSemester] = useState(initialSemester);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const {
    data: reportRes,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetStudentSubjectReportQuery(
    {
      subjectId: subject?.id,
      classId,
      semester: selectedSemester,
      month: selectedMonth,
    },
    {
      skip: !subject?.id || !classId || !selectedSemester || !selectedMonth,
    },
  );

  const reportData = reportRes?.data || {};
  const meta = reportData?.meta || {};
  const attendance = reportData?.attendance || {};
  const attitude = reportData?.attitude || {};
  const formative = reportData?.formative || {};
  const summative = reportData?.summative || {};

  const availableFilters = meta?.available_filters || [];

  const semesterOptions = useMemo(
    () =>
      availableFilters.map((item) => ({
        value: Number(item.semester),
        label: `Semester ${item.semester}`,
      })),
    [availableFilters],
  );

  const monthOptions = useMemo(() => {
    const semesterFilter = availableFilters.find(
      (item) => Number(item.semester) === Number(selectedSemester),
    );

    if (semesterFilter?.months?.length) {
      return semesterFilter.months.map((monthItem) => ({
        value: Number(monthItem.month),
        label:
          monthItem.month_name ||
          MONTH_OPTIONS.find(
            (monthOption) => monthOption.value === Number(monthItem.month),
          )?.label,
      }));
    }

    const fallbackMonths = SEMESTER_MONTHS[selectedSemester] || [];
    return MONTH_OPTIONS.filter((item) =>
      fallbackMonths.includes(Number(item.value)),
    );
  }, [availableFilters, selectedSemester]);

  useEffect(() => {
    if (!semesterOptions.length) return;
    const selectedExists = semesterOptions.some(
      (item) => Number(item.value) === Number(selectedSemester),
    );
    if (!selectedExists) {
      setSelectedSemester(Number(semesterOptions[0].value));
    }
  }, [semesterOptions, selectedSemester]);

  useEffect(() => {
    if (!monthOptions.length) return;
    const selectedExists = monthOptions.some(
      (item) => Number(item.value) === Number(selectedMonth),
    );
    if (!selectedExists) {
      setSelectedMonth(Number(monthOptions[0].value));
    }
  }, [monthOptions, selectedMonth]);

  const attendanceRows = (attendance.records || []).map((item, index) => ({
    key: `${item.date}-${index}`,
    no: index + 1,
    date: formatDateDisplay(item.date),
    status_code: item.status_code || "-",
    status_name: item.status_name || "-",
  }));

  const formativeRows = (formative.entries || []).map((item, index) => ({
    key: item.id || `formative-${index}`,
    no: index + 1,
    chapter_title: item.chapter_title || "-",
    score: item.score,
  }));

  const summativeRows = (summative.entries || []).map((item, index) => ({
    key: item.id || `summative-${index}`,
    no: index + 1,
    chapter_title: item.chapter_title || "-",
    score_written: item.score_written,
    score_skill: item.score_skill,
    final_score: item.final_score,
  }));

  const formativeColumns = [
    { title: "No", dataIndex: "no", width: 56, align: "center" },
    {
      title: "Bab",
      dataIndex: "chapter_title",
      render: (value) => (
        <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value}</div>
      ),
    },
    {
      title: "Nilai",
      dataIndex: "score",
      width: 88,
      align: "center",
      render: (value) => value ?? "-",
    },
  ];

  const summativeColumns = [
    { title: "No", dataIndex: "no", width: 56, align: "center" },
    {
      title: "Bab",
      dataIndex: "chapter_title",
      render: (value) => (
        <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value}</div>
      ),
    },
    {
      title: "Tertulis",
      dataIndex: "score_written",
      width: 88,
      align: "center",
      render: (value) => value ?? "-",
    },
    {
      title: "Praktik",
      dataIndex: "score_skill",
      width: 88,
      align: "center",
      render: (value) => value ?? "-",
    },
    {
      title: "Akhir",
      dataIndex: "final_score",
      width: 88,
      align: "center",
      render: (value) => (
        <Tag color="blue" style={{ marginRight: 0 }}>
          {value ?? "-"}
        </Tag>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <ReportHeader
        subjectName={subject?.name || meta.subject_name}
        className={meta.class_name}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        semesterOptions={semesterOptions}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        monthOptions={monthOptions}
        onRefresh={() => refetch()}
      />

      {isError ? (
        <Alert
          type="error"
          showIcon
          message={error?.data?.message || "Gagal memuat laporan pembelajaran."}
        />
      ) : null}

      {!isFetching &&
      !attendanceRows.length &&
      !formativeRows.length &&
      !summativeRows.length ? (
        <Card style={{ borderRadius: 14 }}>
          <Empty description="Belum ada data laporan pada filter bulan ini." />
        </Card>
      ) : (
        <>
          <ReportSummaryCards
            loading={isFetching}
            attendance={attendance}
            attitude={attitude}
            formative={formative}
            summative={summative}
          />

          <AttendanceSection
            dataSource={attendanceRows}
            attendance={attendance}
            loading={isFetching}
            tableSize={screens.xs ? "small" : "middle"}
          />

          <AttitudeSection attitude={attitude} />

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <ScoreSectionCard
                title="Formatif"
                color="#faad14"
                average={formative.average_score}
                columns={formativeColumns}
                dataSource={formativeRows}
                loading={isFetching}
                tableSize={screens.xs ? "small" : "middle"}
                emptyText="Belum ada data formatif."
              />
            </Col>
            <Col xs={24} lg={12}>
              <ScoreSectionCard
                title="Sumatif"
                color="#722ed1"
                average={summative.average_score}
                columns={summativeColumns}
                dataSource={summativeRows}
                loading={isFetching}
                tableSize={screens.xs ? "small" : "middle"}
                emptyText="Belum ada data sumatif."
              />
            </Col>
          </Row>
        </>
      )}
    </Flex>
  );
};

export default ReportTab;
