import React, { useState } from "react";
import { Alert, Col, Grid, Row } from "antd";
import { motion } from "framer-motion";
import { BookOpen, ClipboardList, School } from "lucide-react";
import { useGetStudentDashQuery } from "../../../service/main/ApiDash";
import { useGetStudentTelegramQuery } from "../../../service/lms/ApiAttendance";
import StudentDashHero from "./components/StudentDashHero";
import StudentDashSkeleton from "./components/StudentDashSkeleton";
import StudentDashStats from "./components/StudentDashStats";
import StudentExamsCard from "./components/StudentExamsCard";
import StudentSubjectsCard from "./components/StudentSubjectsCard";
import StudentTelegramCard from "./components/StudentTelegramCard";
import {
  SUBJECTS_PER_PAGE_DESKTOP,
  SUBJECTS_PER_PAGE_MOBILE,
  containerVariants,
  itemVariants,
  sectionWrapStyle,
} from "./components/studentDashStyles";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const StudentDash = () => {
  const { data, isLoading, isError } = useGetStudentDashQuery();
  const { data: telegramRes } = useGetStudentTelegramQuery();
  const telegram = telegramRes?.data;
  const [subjectPage, setSubjectPage] = useState(0);
  const screens = useBreakpoint();
  const isXs = !screens.sm;
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  const subjectsPerPage = isMobile
    ? SUBJECTS_PER_PAGE_MOBILE
    : SUBJECTS_PER_PAGE_DESKTOP;

  if (isLoading) {
    return <StudentDashSkeleton isMobile={isMobile} isXs={isXs} />;
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat data dashboard siswa.'
      />
    );
  }

  const studentName = data?.student?.full_name || "Siswa";
  const studentInitial = studentName?.[0]?.toUpperCase() || "S";
  const classSummary = [
    data?.classInfo?.name || "Belum ada kelas",
    data?.classInfo?.grade || "-",
    data?.classInfo?.major && data.classInfo.major !== "-"
      ? data.classInfo.major
      : null,
  ]
    .filter(Boolean)
    .join(" • ");
  const subjects = data?.subjects || [];
  const exams = data?.exams || [];
  const schoolName = data?.homebase?.name || "-";
  const totalSubjectPages = Math.max(
    1,
    Math.ceil(subjects.length / subjectsPerPage),
  );
  const safeSubjectPage = Math.min(subjectPage, totalSubjectPages - 1);
  const pagedSubjects = subjects.slice(
    safeSubjectPage * subjectsPerPage,
    safeSubjectPage * subjectsPerPage + subjectsPerPage,
  );

  const stats = [
    {
      key: "subjects",
      title: "Mata Pelajaran",
      value: subjects.length,
      suffix: "mapel",
      icon: <BookOpen size={20} />,
      bg: "#dbeafe",
      color: "#1d4ed8",
    },
    {
      key: "exams",
      title: "Ujian Aktif",
      value: exams.length,
      suffix: "ujian",
      icon: <ClipboardList size={20} />,
      bg: "#dcfce7",
      color: "#15803d",
    },
    {
      key: "school",
      title: "Sekolah",
      value: schoolName,
      icon: <School size={20} />,
      bg: "#fef3c7",
      color: "#b45309",
      isText: true,
    },
  ];

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isXs ? 12 : isMobile ? 14 : 20,
        width: "100%",
        minWidth: 0,
        padding: isMobile ? "0 0 12px" : 0,
      }}
    >
      <MotionDiv variants={itemVariants} style={sectionWrapStyle}>
        <StudentDashHero
          studentName={studentName}
          studentInitial={studentInitial}
          nis={data?.student?.nis}
          classSummary={classSummary}
          periodeName={data?.activePeriode?.name}
          isMobile={isMobile}
          isXs={isXs}
          isCompact={isCompact}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={sectionWrapStyle}>
        <StudentTelegramCard
          telegram={telegram}
          isMobile={isMobile}
          isXs={isXs}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={sectionWrapStyle}>
        <StudentDashStats stats={stats} isMobile={isMobile} isXs={isXs} />
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={sectionWrapStyle}>
        <Row gutter={[isXs ? 12 : 16, isXs ? 12 : 16]} align='stretch'>
          <Col xs={24} lg={14} style={{ display: "flex" }}>
            <StudentSubjectsCard
              subjects={subjects}
              pagedSubjects={pagedSubjects}
              safePage={safeSubjectPage}
              totalPages={totalSubjectPages}
              subjectsPerPage={subjectsPerPage}
              onPrev={() =>
                setSubjectPage((current) => Math.max(current - 1, 0))
              }
              onNext={() =>
                setSubjectPage((current) =>
                  Math.min(current + 1, totalSubjectPages - 1),
                )
              }
              isMobile={isMobile}
              isXs={isXs}
            />
          </Col>

          <Col xs={24} lg={10} style={{ display: "flex" }}>
            <StudentExamsCard
              exams={exams}
              isMobile={isMobile}
              isXs={isXs}
            />
          </Col>
        </Row>
      </MotionDiv>
    </MotionDiv>
  );
};

export default StudentDash;
