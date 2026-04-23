import React, { useMemo } from "react";
import { Card, Grid, Tabs } from "antd";
import { motion } from "framer-motion";
import { BarChart3, ClipboardCheck } from "lucide-react";
import AttendanceTable from "./components/AttendanceTable";
import ReportHeader from "./components/ReportHeader";
import ScoreTable from "./components/ScoreTable";
import {
  useGetExamAttendanceQuery,
  useGetExamScoresQuery,
} from "../../../../service/cbt/ApiExam";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const Report = ({ exam_id, exam_name, token }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: attendanceResponse, isLoading: attendanceLoading } =
    useGetExamAttendanceQuery({ exam_id }, { skip: !exam_id });
  const { data: scoreResponse, isLoading: scoreLoading } = useGetExamScoresQuery(
    { exam_id },
    { skip: !exam_id },
  );

  const attendanceData = useMemo(() => {
    const rows = attendanceResponse?.data || [];
    return rows.map((item) => ({
      id: item.id,
      nis: item.nis,
      name: item.name,
      className: item.class_name,
      ip: item.ip || "-",
      browser: item.browser || "-",
      startAt: item.start_at || "-",
      status: item.status || "belum_masuk",
    }));
  }, [attendanceResponse]);

  const scoreData = useMemo(() => {
    const rows = scoreResponse?.data || [];
    return rows.map((item) => ({
      id: item.id,
      nis: item.nis,
      name: item.name,
      className: item.class_name,
      score: item.score ?? 0,
    }));
  }, [scoreResponse]);

  const stats = useMemo(() => {
    const ongoing = attendanceData.filter(
      (item) => item.status === "mengerjakan",
    ).length;
    const violations = attendanceData.filter(
      (item) => item.status === "pelanggaran",
    ).length;
    const waiting = attendanceData.filter(
      (item) => item.status === "belum_masuk",
    ).length;

    return {
      total: attendanceData.length,
      ongoing,
      violations,
      waiting,
      duration: attendanceResponse?.duration_minutes || 0,
    };
  }, [attendanceData, attendanceResponse]);

  const tabItems = [
    {
      key: "attendance",
      label: "Kehadiran",
      icon: <ClipboardCheck size={16} />,
      children: (
        <AttendanceTable
          data={attendanceData}
          examId={exam_id}
          isMobile={isMobile}
          isLoading={attendanceLoading}
        />
      ),
    },
    {
      key: "scores",
      label: "Nilai",
      icon: <BarChart3 size={16} />,
      children: (
        <ScoreTable
          data={scoreData}
          examName={exam_name}
          examId={exam_id}
          isMobile={isMobile}
          isLoading={scoreLoading}
        />
      ),
    },
  ];

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <MotionDiv variants={itemVariants}>
        <ReportHeader
          examName={exam_name}
          stats={stats}
          isMobile={isMobile}
          examToken={token}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Card
          bordered={false}
          style={{
            borderRadius: 24,
            boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 14 : 18 } }}
        >
          <Tabs
            defaultActiveKey='attendance'
            size={isMobile ? "small" : "middle"}
            tabBarGutter={isMobile ? 8 : 16}
            items={tabItems}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Report;
