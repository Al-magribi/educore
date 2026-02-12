import React, { useEffect, useMemo, useState } from "react";
import { Grid, Tabs } from "antd";
import { useGetClassesQuery } from "../../../../../service/lms/ApiLms";
import { useGetGradingMetaQuery } from "../../../../../service/lms/ApiGrading";
import RecapAttendance from "./components/RecapAttendance";
import RecapFormative from "./components/RecapFormative";
import RecapSummative from "./components/RecapSummative";
import FinalScore from "./components/FinalScore";

const { useBreakpoint } = Grid;

const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const SEMESTER_MONTH_MAP = {
  1: [7, 8, 9, 10, 11, 12],
  2: [1, 2, 3, 4, 5, 6],
};

const getDefaultMonthForSemester = (semester) => {
  const nowMonth = new Date().getMonth() + 1;
  if (SEMESTER_MONTH_MAP[semester]?.includes(nowMonth)) {
    return nowMonth;
  }
  return SEMESTER_MONTH_MAP[semester]?.[0] || 7;
};

const Recap = ({ subjectId, subject }) => {
  const screens = useBreakpoint();
  const { data: metaRes } = useGetGradingMetaQuery();
  const activePeriode = metaRes?.data?.activePeriode || null;

  const [activeTab, setActiveTab] = useState("attendance");
  const [semester, setSemester] = useState(1);
  const [month, setMonth] = useState(getDefaultMonthForSemester(1));
  const [classId, setClassId] = useState(null);

  const { data: classRes, isLoading: classLoading } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !subjectId },
  );
  const classes = classRes?.data || [];

  useEffect(() => {
    if (!classes.length) {
      setClassId(null);
      return;
    }
    if (
      !classId ||
      !classes.some((item) => String(item.id) === String(classId))
    ) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  useEffect(() => {
    if (!SEMESTER_MONTH_MAP[semester]?.includes(month)) {
      setMonth(getDefaultMonthForSemester(semester));
    }
  }, [semester, month]);

  const monthOptions = useMemo(
    () =>
      MONTH_OPTIONS.filter((item) =>
        SEMESTER_MONTH_MAP[semester].includes(item.value),
      ),
    [semester],
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        {
          key: "attendance",
          label: "Rekapitulasi Absensi",
          children: (
            <RecapAttendance
              isActive={activeTab === "attendance"}
              subjectId={subjectId}
              subject={subject}
              activePeriode={activePeriode}
              classes={classes}
              classLoading={classLoading}
              classId={classId}
              setClassId={setClassId}
              semester={semester}
              setSemester={setSemester}
              month={month}
              setMonth={setMonth}
              monthOptions={monthOptions}
              screens={screens}
            />
          ),
        },
        {
          key: "score",
          label: "Rekapitulasi Formatif",
          children: (
            <RecapFormative
              isActive={activeTab === "score"}
              subjectId={subjectId}
              subject={subject}
              activePeriode={activePeriode}
              classes={classes}
              classLoading={classLoading}
              classId={classId}
              setClassId={setClassId}
              semester={semester}
              setSemester={setSemester}
              month={month}
              setMonth={setMonth}
              monthOptions={monthOptions}
              screens={screens}
            />
          ),
        },
        {
          key: "summative",
          label: "Rekapitulasi Sumatif",
          children: (
            <RecapSummative
              isActive={activeTab === "summative"}
              subjectId={subjectId}
              subject={subject}
              activePeriode={activePeriode}
              classes={classes}
              classLoading={classLoading}
              classId={classId}
              setClassId={setClassId}
              semester={semester}
              setSemester={setSemester}
              screens={screens}
            />
          ),
        },
        {
          key: "final",
          label: "Rekapitulasi Nilai Akhir",
          children: <FinalScore />,
        },
      ]}
    />
  );
};

export default Recap;
