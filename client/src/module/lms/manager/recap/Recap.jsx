import React, { Suspense, lazy, useMemo, useState } from "react";
import { Card, Grid, Skeleton, Tabs } from "antd";
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
  const [semester, setSemester] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);

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

  const tabItems = [
    {
      key: "attendance",
      label: "Rekapitulasi Absensi",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapAttendance
            isActive={activeTab === "attendance"}
            subjectId={subjectId}
            subject={subject}
            activePeriode={activePeriode}
            classes={classes}
            classLoading={classLoading}
            classId={classId}
            setClassId={setSelectedClassId}
            semester={semester}
            setSemester={setSemester}
            isAdminView={isAdminView}
            teacherId={selectedTeacherId}
            setTeacherId={setTeacherId}
            teachers={teachers}
            teacherLoading={teacherLoading}
            screens={screens}
          />
        </Suspense>
      ),
    },
    {
      key: "score",
      label: "Rekapitulasi Formatif",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapFormative
            isActive={activeTab === "score"}
            subjectId={subjectId}
            subject={subject}
            activePeriode={activePeriode}
            classes={classes}
            classLoading={classLoading}
            classId={classId}
            setClassId={setSelectedClassId}
            semester={semester}
            setSemester={setSemester}
            isAdminView={isAdminView}
            teacherId={normalizedTeacherId}
            setTeacherId={setTeacherId}
            teachers={teachers}
            teacherLoading={teacherLoading}
            screens={screens}
          />
        </Suspense>
      ),
    },
    {
      key: "summative",
      label: "Rekapitulasi Sumatif",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapSummative
            isActive={activeTab === "summative"}
            subjectId={subjectId}
            subject={subject}
            activePeriode={activePeriode}
            classes={classes}
            classLoading={classLoading}
            classId={classId}
            setClassId={setSelectedClassId}
            semester={semester}
            setSemester={setSemester}
            isAdminView={isAdminView}
            teacherId={normalizedTeacherId}
            setTeacherId={setTeacherId}
            teachers={teachers}
            teacherLoading={teacherLoading}
            screens={screens}
          />
        </Suspense>
      ),
    },
    {
      key: "final",
      label: "Rekapitulasi Nilai Akhir",
      children: (
        <Suspense fallback={recapFallback}>
          <FinalScore
            isActive={activeTab === "final"}
            subjectId={subjectId}
            subject={subject}
            activePeriode={activePeriode}
            classes={classes}
            classLoading={classLoading}
            classId={classId}
            setClassId={setSelectedClassId}
            semester={semester}
            setSemester={setSemester}
            isAdminView={isAdminView}
            teacherId={normalizedTeacherId}
            setTeacherId={setTeacherId}
            teachers={teachers}
            teacherLoading={teacherLoading}
            screens={screens}
          />
        </Suspense>
      ),
    },
    {
      key: "nilai-raport",
      label: "Nilai Raport",
      children: (
        <Suspense fallback={recapFallback}>
          <NilaiRaport
            isActive={activeTab === "nilai-raport"}
            subjectId={subjectId}
            subject={subject}
            activePeriode={activePeriode}
            classes={classes}
            classLoading={classLoading}
            classId={classId}
            setClassId={setSelectedClassId}
            semester={semester}
            setSemester={setSemester}
            isAdminView={isAdminView}
            teacherId={normalizedTeacherId}
            setTeacherId={setTeacherId}
            teachers={teachers}
            teacherLoading={teacherLoading}
            screens={screens}
          />
        </Suspense>
      ),
    },
  ];

  if (isAdminView) {
    tabItems.push({
      key: "learning-summary",
      label: "Ringkasan Pembelajaran",
      children: (
        <Suspense fallback={recapFallback}>
          <RecapLearningSummary
            isActive={activeTab === "learning-summary"}
            subjectId={subjectId}
            subject={subject}
            activePeriode={activePeriode}
            screens={screens}
          />
        </Suspense>
      ),
    });
  }

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
  );
};

export default Recap;
