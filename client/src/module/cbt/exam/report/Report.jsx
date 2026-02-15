import React, { useEffect, useMemo, useState } from "react";
import { Tabs } from "antd";
import AttendanceTable from "./components/AttendanceTable";
import ReportHeader from "./components/ReportHeader";
import ScoreTable from "./components/ScoreTable";
import {
  useGetExamAttendanceQuery,
  useGetExamScoresQuery,
} from "../../../../service/cbt/ApiExam";

const Report = ({ exam_id, exam_name, token }) => {
  const [isMobile, setIsMobile] = useState(false);
  const { data: attendanceResponse, isLoading: attendanceLoading } =
    useGetExamAttendanceQuery(
    { exam_id },
    { skip: !exam_id },
  );
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

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth <= 480);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ReportHeader
        examName={exam_name}
        stats={stats}
        isMobile={isMobile}
        examToken={token}
      />

      <Tabs
        defaultActiveKey='attendance'
        size={isMobile ? "small" : "middle"}
        items={[
          {
            key: "attendance",
            label: "Kehadiran",
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
        ]}
      />
    </div>
  );
};

export default Report;
