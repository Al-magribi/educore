import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Card, Grid, Skeleton, Tabs } from "antd";
import dayjs from "dayjs";
import { useGetClassesQuery } from "../../../../service/lms/ApiLms";
import { useGetGradingMetaQuery } from "../../../../service/lms/ApiGrading";
import { useGetRecapTeachersQuery } from "../../../../service/lms/ApiRecap";

const RecapAttendance = lazy(() => import("./components/RecapAttendance"));
const RecapFormative = lazy(() => import("./components/RecapFormative"));
const RecapSummative = lazy(() => import("./components/RecapSummative"));
const FinalScore = lazy(() => import("./components/FinalScore"));
const NilaiRaport = lazy(() => import("./components/NilaiRaport"));
const RecapLearningSummary = lazy(
  () => import("./components/RecapLearningSummary"),
);
const RecapJournal = lazy(() => import("./components/RecapJournal"));

const { useBreakpoint } = Grid;

const recapFallback = (
  <Card style={{ borderRadius: 12 }}>
    <Skeleton active paragraph={{ rows: 4 }} />
  </Card>
);

const Recap = ({ subjectId, subject, isAdminView = false }) => {
  const screens = useBreakpoint();
  const { data: metaRes } = useGetGradingMetaQuery(undefined, {
    skip: isAdminView,
  });
  const activePeriode = metaRes?.data?.activePeriode || null;

  const [activeTab, setActiveTab] = useState("attendance");
  const [semester, setSemester] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);

  const derivedSemester = useMemo(() => {
    const periodStartMonth = activePeriode?.start
      ? dayjs(activePeriode.start).startOf("month")
      : null;
    const periodEndMonth = activePeriode?.end
      ? dayjs(activePeriode.end).endOf("month")
      : null;
    const currentMonth = dayjs().startOf("month");

    if (
      periodStartMonth &&
      currentMonth.isValid() &&
      !currentMonth.isBefore(periodStartMonth, "month")
    ) {
      const startYear = periodStartMonth.year();
      const startMonth = periodStartMonth.month() + 1;
      if (
        currentMonth.year() === startYear &&
        currentMonth.month() + 1 >= startMonth
      ) {
        return 1;
      }
    }

    if (
      periodEndMonth &&
      currentMonth.isValid() &&
      !currentMonth.isAfter(periodEndMonth, "month")
    ) {
      const endYear = periodEndMonth.year();
      const endMonth = periodEndMonth.month() + 1;
      if (
        currentMonth.year() === endYear &&
        currentMonth.month() + 1 <= endMonth
      ) {
        return 2;
      }
    }

    return currentMonth.month() + 1 >= 7 ? 1 : 2;
  }, [activePeriode?.end, activePeriode?.start]);

  useEffect(() => {
    if (derivedSemester) {
      setSemester((prev) => prev ?? derivedSemester);
    }
  }, [derivedSemester]);

  const { data: classRes, isLoading: classLoading } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !subjectId },
  );
  const classes = classRes?.data || [];

  const classId = useMemo(() => {
    if (!classes.length) return null;
    if (
      selectedClassId &&
      classes.some((item) => String(item.id) === String(selectedClassId))
    ) {
      return selectedClassId;
    }
    return classes[0].id;
  }, [classes, selectedClassId]);

  const { data: teachersRes, isLoading: teacherLoading } =
    useGetRecapTeachersQuery(
      { subjectId, classId },
      { skip: !isAdminView || !subjectId || !classId },
    );
  const teachers = teachersRes?.data || [];

  const selectedTeacherId = useMemo(() => {
    if (!isAdminView) return null;
    if (!teachers.length) return null;
    if (
      teacherId &&
      teachers.some((item) => String(item.id) === String(teacherId))
    ) {
      return teacherId;
    }
    return null;
  }, [isAdminView, teacherId, teachers]);

  const normalizedTeacherId = useMemo(() => {
    if (!isAdminView) return null;
    if (!teachers.length) return null;
    if (selectedTeacherId) {
      return selectedTeacherId;
    }
    return teachers[0].id;
  }, [isAdminView, selectedTeacherId, teachers]);

  const isMobile = !screens.md;
  const isCompact = !screens.sm;

  const commonProps = {
    subjectId,
    subject,
    activePeriode,
    screens,
  };

  const gradebookProps = {
    ...commonProps,
    classes,
    classLoading,
    classId,
    setClassId: setSelectedClassId,
    semester,
    setSemester,
    isAdminView,
    setTeacherId,
    teachers,
    teacherLoading,
    teacherId: normalizedTeacherId,
  };

  const tabItems = [
    {
      key: "attendance",
      label: isCompact ? "Absensi" : "Rekapitulasi Absensi",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapAttendance
            {...gradebookProps}
            isActive={activeTab === "attendance"}
            teacherId={selectedTeacherId}
          />
        </Suspense>
      ),
    },
    {
      key: "score",
      label: isCompact ? "Formatif" : "Rekapitulasi Formatif",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapFormative
            {...gradebookProps}
            isActive={activeTab === "score"}
          />
        </Suspense>
      ),
    },
    {
      key: "summative",
      label: isCompact ? "Sumatif" : "Rekapitulasi Sumatif",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapSummative
            {...gradebookProps}
            isActive={activeTab === "summative"}
          />
        </Suspense>
      ),
    },
    {
      key: "final",
      label: isCompact ? "Nilai Akhir" : "Rekapitulasi Nilai Akhir",
      children: (
        <Suspense fallback={recapFallback}>
          <FinalScore {...gradebookProps} isActive={activeTab === "final"} />
        </Suspense>
      ),
    },
    {
      key: "nilai-raport",
      label: "Nilai Raport",
      children: (
        <Suspense fallback={recapFallback}>
          <NilaiRaport
            {...gradebookProps}
            isActive={activeTab === "nilai-raport"}
          />
        </Suspense>
      ),
    },
  ];

  if (isAdminView) {
    tabItems.push({
      key: "learning-summary",
      label: isCompact ? "Pembelajaran" : "Ringkasan Pembelajaran",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapLearningSummary
            {...commonProps}
            isActive={activeTab === "learning-summary"}
          />
        </Suspense>
      ),
    });
    tabItems.push({
      key: "journal-summary",
      label: isCompact ? "Jurnal" : "Ringkasan Jurnal",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapJournal
            {...commonProps}
            isActive={activeTab === "journal-summary"}
          />
        </Suspense>
      ),
    });
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
      size={isMobile ? "small" : "large"}
      tabBarGutter={isCompact ? 6 : isMobile ? 8 : 16}
      style={{ width: "100%", minWidth: 0 }}
      tabBarStyle={{ marginBottom: isMobile ? 12 : 16 }}
    />
  );
};

export default Recap;
