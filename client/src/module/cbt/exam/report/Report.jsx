import React, { useMemo } from "react";
import { Card, Flex, Grid, Tabs, theme } from "antd";
import { motion } from "framer-motion";
import {
  BarChart3,
  BrainCircuit,
  ClipboardList,
  ClipboardCheck,
  FileSpreadsheet,
} from "lucide-react";
import AttendanceTable from "./components/AttendanceTable";
import BloomAnalysis from "./components/BloomAnalysis";
import ManualReviewQueue from "./components/answer/ManualReviewQueue";
import ReportHeader from "./components/ReportHeader";
import ReportStudentAnswer from "./components/answer/ReportStudentAnswer";
import ScoreTable from "./components/ScoreTable";
import { useSearchParams } from "react-router-dom";
import {
  useGetExamAttendanceQuery,
  useGetExamBloomAnalysisQuery,
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
  const { token: themeToken } = theme.useToken();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("active_tab") || "attendance";

  const { data: attendanceResponse, isLoading: attendanceLoading } =
    useGetExamAttendanceQuery({ exam_id }, { skip: !exam_id });
  const { data: scoreResponse, isLoading: scoreLoading } =
    useGetExamScoresQuery({ exam_id }, { skip: !exam_id });
  const { data: bloomResponse, isLoading: bloomLoading } =
    useGetExamBloomAnalysisQuery({ exam_id }, { skip: !exam_id });

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

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: themeToken.colorTextSecondary,
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const tabItems = [
    {
      key: "attendance",
      label: createTabLabel(
        "Kehadiran",
        <ClipboardCheck size={16} />,
        "Pantau peserta",
      ),
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
      key: "student-answer-report",
      label: createTabLabel(
        "Jawaban",
        <FileSpreadsheet size={16} />,
        "Analisis jawaban",
      ),
      children: (
        <ReportStudentAnswer
          examId={exam_id}
          examName={exam_name}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: "manual-review",
      label: createTabLabel(
        "Koreksi",
        <ClipboardList size={16} />,
        "Review manual",
      ),
      children: (
        <ManualReviewQueue
          examId={exam_id}
          examName={exam_name}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: "scores",
      label: createTabLabel("Nilai", <BarChart3 size={16} />, "Rekap skor"),
      children: (
        <ScoreTable
          data={scoreData}
          examName={exam_name}
          isMobile={isMobile}
          isLoading={scoreLoading}
        />
      ),
    },
    {
      key: "bloom-analysis",
      label: createTabLabel(
        "Bloom",
        <BrainCircuit size={16} />,
        "Level kognitif",
      ),
      children: (
        <BloomAnalysis
          data={bloomResponse}
          isMobile={isMobile}
          isLoading={bloomLoading}
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
          variant='borderless'
          style={{
            borderRadius: 24,
            boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 14 : 18 } }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={(key) =>
              setSearchParams({
                view: "report",
                exam_id: String(exam_id),
                exam_name: exam_name,
                active_tab: key,
              })
            }
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
            items={tabItems}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Report;
