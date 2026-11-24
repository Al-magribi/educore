import React, { useMemo, useState } from "react";
import { Flex, Grid, Segmented } from "antd";
import { motion } from "framer-motion";
import {
  BarChart3,
  BrainCircuit,
  ClipboardList,
  ClipboardCheck,
  FileSpreadsheet,
  FlaskConical,
} from "lucide-react";
import AttendanceTable from "./components/AttendanceTable";
import BloomAnalysis from "./components/bloom/BloomAnalysis";
import ItemAnalysis from "./components/itemAnalysis/ItemAnalysis";
import ManualReviewQueue from "./components/answer/ManualReviewQueue";
import ReportHeader from "./components/ReportHeader";
import ReportStudentAnswer from "./components/answer/ReportStudentAnswer";
import ScoreTable from "./components/ScoreTable";
import { museCardStyle } from "../../../../config/theme";
import { useSearchParams } from "react-router-dom";
import {
  useGetExamAttendanceQuery,
  useGetExamBloomAnalysisQuery,
  useGetExamItemAnalysisQuery,
  useGetExamScoresQuery,
} from "../../../../service/cbt/ApiExam";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const slugifyExamName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "-");

const withReportSearchParams = (
  prev,
  { examId, examName, activeTab, examToken },
) => {
  const next = new URLSearchParams(prev);
  next.set("view", "report");
  if (examId) next.set("exam_id", String(examId));
  const slugName = slugifyExamName(examName);
  if (slugName) next.set("exam_name", slugName);
  if (activeTab) next.set("active_tab", activeTab);
  const tokenValue = examToken || next.get("token") || "";
  if (tokenValue) next.set("token", tokenValue);
  return next;
};

const Report = ({ exam_id, exam_name, token }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("active_tab") || "attendance";
  const [includeEssayAnalysis, setIncludeEssayAnalysis] = useState(false);
  const [examToken, setExamToken] = useState(
    () => token || searchParams.get("token") || "",
  );

  const { data: attendanceResponse, isLoading: attendanceLoading } =
    useGetExamAttendanceQuery({ exam_id }, { skip: !exam_id });
  const { data: scoreResponse, isLoading: scoreLoading } =
    useGetExamScoresQuery(
      { exam_id },
      { skip: !exam_id || activeTab !== "scores" },
    );
  const { data: bloomResponse, isLoading: bloomLoading } =
    useGetExamBloomAnalysisQuery(
      { exam_id },
      { skip: !exam_id || activeTab !== "bloom-analysis" },
    );
  const { data: itemAnalysisResponse, isLoading: itemAnalysisLoading } =
    useGetExamItemAnalysisQuery(
      { exam_id, include_essay: includeEssayAnalysis },
      { skip: !exam_id || activeTab !== "item-analysis" },
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
      violationCount: Number(item.violation_count) || 0,
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
      scoreSingle: item.score_single ?? 0,
      scoreMulti: item.score_multi ?? 0,
      scoreMatch: item.score_match ?? 0,
      scoreTrueFalse: item.score_true_false ?? 0,
      scoreShort: item.score_short ?? 0,
      scoreEssay: item.score_essay ?? 0,
    }));
  }, [scoreResponse]);

  const incomingToken =
    token || searchParams.get("token") || attendanceResponse?.token || "";
  if (incomingToken && incomingToken !== examToken) {
    setExamToken(incomingToken);
  }
  const resolvedToken = incomingToken || examToken;

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

  const iconSize = 14;

  const tabItems = [
    {
      key: "attendance",
      label: isMobile ? "Hadir" : "Kehadiran",
      icon: <ClipboardCheck size={iconSize} />,
      render: () => (
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
      label: "Jawaban",
      icon: <FileSpreadsheet size={iconSize} />,
      render: () => (
        <ReportStudentAnswer
          examId={exam_id}
          examName={exam_name}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: "manual-review",
      label: "Koreksi",
      icon: <ClipboardList size={iconSize} />,
      render: () => (
        <ManualReviewQueue
          examId={exam_id}
          examName={exam_name}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: "scores",
      label: "Nilai",
      icon: <BarChart3 size={iconSize} />,
      render: () => (
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
      label: "Bloom",
      icon: <BrainCircuit size={iconSize} />,
      render: () => (
        <BloomAnalysis
          data={bloomResponse}
          isMobile={isMobile}
          isLoading={bloomLoading}
        />
      ),
    },
    {
      key: "item-analysis",
      label: isMobile ? "Soal" : "Analisa Soal",
      icon: <FlaskConical size={iconSize} />,
      render: () => (
        <ItemAnalysis
          data={itemAnalysisResponse}
          examName={exam_name}
          includeEssay={includeEssayAnalysis}
          isMobile={isMobile}
          isLoading={itemAnalysisLoading}
          onIncludeEssayChange={setIncludeEssayAnalysis}
        />
      ),
    },
  ];

  const activeItem =
    tabItems.find((item) => item.key === activeTab) || tabItems[0];

  const handleTabChange = (key) =>
    setSearchParams((prev) =>
      withReportSearchParams(prev, {
        examId: exam_id,
        examName: exam_name,
        activeTab: key,
        examToken: resolvedToken,
      }),
    );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 16 : 24,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <ReportHeader
        examName={exam_name}
        stats={stats}
        isMobile={isMobile}
        examToken={resolvedToken}
      />

      <div style={{ overflowX: "auto", margin: "-4px", padding: 4 }}>
        <Segmented
          aria-label='Bagian laporan ujian'
          value={activeItem.key}
          onChange={handleTabChange}
          size={isMobile ? "small" : "middle"}
          style={{ background: "#fff", boxShadow: museCardStyle.boxShadow, padding: 3 }}
          options={tabItems.map((item) => ({
            value: item.key,
            label: (
              <Flex
                align='center'
                gap={6}
                style={{ padding: isMobile ? "0 2px" : "0 4px", fontSize: 13 }}
              >
                {item.icon}
                <span style={{ fontWeight: 600 }}>{item.label}</span>
              </Flex>
            ),
          }))}
        />
      </div>

      <div key={activeItem.key} style={{ minWidth: 0 }}>
        {activeItem.render()}
      </div>
    </MotionDiv>
  );
};

export default Report;
