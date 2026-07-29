import React, { useMemo, useState } from "react";
import { Card, Flex, Grid, Tabs, theme } from "antd";
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
import { useSearchParams } from "react-router-dom";
import {
  useGetExamAttendanceQuery,
  useGetExamBloomAnalysisQuery,
  useGetExamItemAnalysisQuery,
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

const reportTabsCss = `
  .cbt-report-tabs .ant-tabs-nav {
    margin-bottom: 24px;
  }
  .cbt-report-tabs .ant-tabs-nav::before {
    border-bottom-color: rgba(148, 163, 184, 0.22);
  }
  .cbt-report-tabs .ant-tabs-tab {
    padding: 10px 0 14px;
    margin: 0 22px 0 0;
  }
  .cbt-report-tabs .ant-tabs-tab-btn {
    color: #0f172a;
  }
  .cbt-report-tabs .ant-tabs-tab-active .cbt-report-tab-label {
    color: #2563eb;
  }
  .cbt-report-tabs .ant-tabs-tab-active .cbt-report-tab-icon {
    background: linear-gradient(135deg, #dbeafe, #dcfce7);
    color: #2563eb;
    border-color: rgba(37, 99, 235, 0.18);
  }
  .cbt-report-tabs .ant-tabs-ink-bar {
    background: #2563eb;
    height: 3px !important;
    border-radius: 999px;
  }
  .cbt-report-tabs.is-mobile .ant-tabs-nav {
    margin-bottom: 16px;
  }
  .cbt-report-tabs.is-mobile .ant-tabs-tab {
    padding: 6px 0 10px;
    margin: 0 10px 0 0;
  }
  .cbt-report-tabs.is-mobile .cbt-report-tab-label {
    gap: 6px !important;
  }
  .cbt-report-tabs.is-mobile .cbt-report-tab-icon {
    width: 26px !important;
    height: 26px !important;
    border-radius: 8px !important;
  }
  .cbt-report-tabs.is-mobile .cbt-report-tab-label > div > span:first-child {
    font-size: 13px;
  }
`;

const Report = ({ exam_id, exam_name, token }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token: themeToken } = theme.useToken();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("active_tab") || "attendance";
  const [includeEssayAnalysis, setIncludeEssayAnalysis] = useState(false);

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

  const createTabLabel = (label, mobileLabel, icon, caption) => (
    <Flex
      align='center'
      gap={isMobile ? 6 : 10}
      className='cbt-report-tab-label'
    >
      <span
        className='cbt-report-tab-icon'
        style={{
          width: isMobile ? 26 : 34,
          height: isMobile ? 26 : 34,
          display: "grid",
          placeItems: "center",
          borderRadius: isMobile ? 8 : 12,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>
          {isMobile ? mobileLabel : label}
        </span>
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

  const iconSize = isMobile ? 14 : 16;

  const tabItems = [
    {
      key: "attendance",
      label: createTabLabel(
        "Kehadiran",
        "Hadir",
        <ClipboardCheck size={iconSize} />,
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
        "Jawaban",
        <FileSpreadsheet size={iconSize} />,
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
        "Koreksi",
        <ClipboardList size={iconSize} />,
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
      label: createTabLabel(
        "Nilai",
        "Nilai",
        <BarChart3 size={iconSize} />,
        "Rekap skor",
      ),
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
        "Bloom",
        <BrainCircuit size={iconSize} />,
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
    {
      key: "item-analysis",
      label: createTabLabel(
        "Analisa Soal",
        "Soal",
        <FlaskConical size={iconSize} />,
        "Kualitas butir",
      ),
      children: (
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

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 12 : 18,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <style>{reportTabsCss}</style>
      <MotionDiv variants={itemVariants} style={{ minWidth: 0 }}>
        <ReportHeader
          examName={exam_name}
          stats={stats}
          isMobile={isMobile}
          examToken={token}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={{ minWidth: 0 }}>
        <Card
          variant='borderless'
          style={{
            borderRadius: isMobile ? 18 : 24,
            boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
          }}
          styles={{ body: { padding: isMobile ? 10 : 18 } }}
        >
          <Tabs
            className={`cbt-report-tabs${isMobile ? " is-mobile" : ""}`}
            activeKey={activeTab}
            onChange={(key) =>
              setSearchParams({
                view: "report",
                exam_id: String(exam_id),
                exam_name: exam_name,
                active_tab: key,
              })
            }
            size={isMobile ? "small" : "large"}
            tabBarGutter={isMobile ? 8 : 22}
            items={tabItems}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Report;
