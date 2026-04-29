import React, { useMemo, useState } from "react";
import { Card, Empty, Space, Tabs } from "antd";
import { motion } from "framer-motion";
import { CheckCircle2, Target, Users, XCircle } from "lucide-react";
import BloomHeader from "./BloomHeader";
import BloomMetrics from "./BloomMetrics";
import BloomQuestionTable from "./BloomQuestionTable";
import BloomStudentProfileTable from "./BloomStudentProfileTable";
import BloomSummaryTable from "./BloomSummaryTable";
import BloomTeacherInsight from "./BloomTeacherInsight";
import {
  addStatus,
  createStats,
  formatPercent,
  getBloomCode,
  getClassValue,
  getLevelKey,
  getMasteryMeta,
  getStudentId,
  normalizeQuestionText,
  sortBloomRows,
  toPercentage,
} from "./bloomUtils";

const MotionDiv = motion.div;

const bloomTabsCss = `
  .cbt-bloom-tabs .ant-tabs-nav {
    margin-bottom: 20px;
  }
  .cbt-bloom-tabs .ant-tabs-nav::before {
    border-bottom-color: rgba(148, 163, 184, 0.22);
  }
  .cbt-bloom-tabs .ant-tabs-tab {
    padding: 0 0 12px;
    margin: 0 24px 0 0;
    color: #64748b;
    font-weight: 600;
  }
  .cbt-bloom-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #2563eb;
  }
  .cbt-bloom-tabs .ant-tabs-ink-bar {
    background: #2563eb;
    height: 3px !important;
    border-radius: 999px;
  }
`;

const BloomAnalysis = ({ data, isLoading = false, isMobile = false }) => {
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");

  const questions = useMemo(() => data?.per_question || [], [data]);
  const granularRows = useMemo(() => data?.student_question_results || [], [data]);

  const students = useMemo(() => {
    const rows = data?.students || [];
    return rows.map((item) => ({
      id: item.id ?? item.student_id,
      nis: item.nis ?? item.student_nis ?? "-",
      name: item.name ?? item.student_name ?? "-",
      class_id: item.class_id,
      class_name: item.class_name || "-",
    }));
  }, [data]);

  const classOptions = useMemo(() => {
    const source =
      data?.classes?.length > 0
        ? data.classes
        : [
            ...students
              .reduce((acc, student) => {
                const value = getClassValue(student);
                if (!value) return acc;
                if (!acc.has(value)) {
                  acc.set(value, {
                    id: student.class_id,
                    name: student.class_name,
                    total_students: 0,
                  });
                }
                acc.get(value).total_students += 1;
                return acc;
              }, new Map())
              .values(),
          ];

    return source
      .filter((item) => getClassValue(item))
      .map((item) => ({
        value: getClassValue(item),
        label: item.name || item.class_name || "-",
        total_students: item.total_students || 0,
      }));
  }, [data, students]);

  const hasGranularData = students.length > 0 && granularRows.length > 0;

  const studentOptions = useMemo(
    () =>
      students
        .filter((student) =>
          classFilter === "all" ? true : getClassValue(student) === classFilter,
        )
        .map((student) => ({
          value: getStudentId(student),
          label: `${student.name} - ${student.nis || "-"} (${student.class_name || "-"})`,
        })),
    [classFilter, students],
  );

  const selectedStudent = useMemo(() => {
    if (studentFilter === "all") return null;
    const selected = students.find((student) => getStudentId(student) === studentFilter);
    if (!selected) return null;
    if (classFilter !== "all" && getClassValue(selected) !== classFilter) return null;
    return selected;
  }, [classFilter, studentFilter, students]);

  const effectiveStudentFilter = selectedStudent ? getStudentId(selectedStudent) : "all";

  const filteredStudents = useMemo(() => {
    if (!hasGranularData) return [];
    return students.filter((student) => {
      const matchClass =
        classFilter === "all" ? true : getClassValue(student) === classFilter;
      const matchStudent =
        effectiveStudentFilter === "all"
          ? true
          : getStudentId(student) === effectiveStudentFilter;
      return matchClass && matchStudent;
    });
  }, [classFilter, effectiveStudentFilter, hasGranularData, students]);

  const filteredStudentIds = useMemo(
    () => new Set(filteredStudents.map((student) => getStudentId(student))),
    [filteredStudents],
  );

  const selectedClassLabel = useMemo(() => {
    if (classFilter === "all") return "Semua Kelas";
    return classOptions.find((item) => item.value === classFilter)?.label || "Kelas";
  }, [classFilter, classOptions]);

  const activeScopeLabel = selectedStudent
    ? `${selectedStudent.name} (${selectedStudent.class_name || "-"})`
    : selectedClassLabel;

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  const questionStats = useMemo(() => {
    if (!hasGranularData) return questions;

    const statsByQuestion = new Map(
      questions.map((question) => [
        question.id,
        {
          ...question,
          ...createStats(),
          total_students: filteredStudents.length,
          student_status: null,
        },
      ]),
    );

    granularRows.forEach((row) => {
      const studentId = String(row.student_id);
      if (!filteredStudentIds.has(studentId)) return;

      const current = statsByQuestion.get(row.question_id);
      if (!current) return;

      addStatus(current, row.status);
      if (effectiveStudentFilter !== "all" && effectiveStudentFilter === studentId) {
        current.student_status = row.status;
      }
    });

    return questions.map((question) => {
      const current = statsByQuestion.get(question.id) || {
        ...question,
        ...createStats(),
      };
      return {
        ...current,
        correct_percentage: toPercentage(current.correct_count, filteredStudents.length),
      };
    });
  }, [
    effectiveStudentFilter,
    filteredStudentIds,
    filteredStudents.length,
    granularRows,
    hasGranularData,
    questions,
  ]);

  const bloomSummary = useMemo(() => {
    if (!hasGranularData) return data?.by_bloom_level || [];

    const summaryMap = new Map();
    questionStats.forEach((question) => {
      const key = getLevelKey(question.bloom_level);
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          bloom_level: question.bloom_level,
          bloom_label: question.bloom_label,
          ...createStats(),
          total_students: filteredStudents.length,
        });
      }

      const current = summaryMap.get(key);
      current.total_questions += 1;
      current.correct_count += Number(question.correct_count || 0);
      current.incorrect_count += Number(question.incorrect_count || 0);
      current.unanswered_count += Number(question.unanswered_count || 0);
      current.pending_review_count += Number(question.pending_review_count || 0);
    });

    return sortBloomRows(
      [...summaryMap.values()].map((item) => ({
        ...item,
        correct_percentage: toPercentage(
          item.correct_count,
          item.total_questions * filteredStudents.length,
        ),
      })),
    );
  }, [data, filteredStudents.length, hasGranularData, questionStats]);

  const perQuestion = useMemo(() => {
    if (!searchText.trim()) return questionStats;
    const query = searchText.toLowerCase();
    return questionStats.filter((item) => {
      const questionText = normalizeQuestionText(item.question).toLowerCase();
      const levelText = `${item.bloom_label || ""} ${item.q_type || ""}`.toLowerCase();
      return questionText.includes(query) || levelText.includes(query);
    });
  }, [questionStats, searchText]);

  const perStudentAnalysis = useMemo(() => {
    if (!hasGranularData) return [];

    const statsByStudent = new Map(
      filteredStudents.map((student) => [
        getStudentId(student),
        {
          student_id: student.id,
          nis: student.nis,
          name: student.name,
          class_id: student.class_id,
          class_name: student.class_name,
          ...createStats(),
          by_bloom_level: new Map(),
        },
      ]),
    );

    granularRows.forEach((row) => {
      const studentId = String(row.student_id);
      const current = statsByStudent.get(studentId);
      if (!current) return;

      const question = questionById.get(row.question_id) || row;
      current.total_questions += 1;
      addStatus(current, row.status);

      const key = getLevelKey(question.bloom_level);
      if (!current.by_bloom_level.has(key)) {
        current.by_bloom_level.set(key, {
          bloom_level: question.bloom_level,
          bloom_label: question.bloom_label || row.bloom_label,
          ...createStats(),
          total_students: 1,
        });
      }

      const bloomStats = current.by_bloom_level.get(key);
      bloomStats.total_questions += 1;
      addStatus(bloomStats, row.status);
    });

    return [...statsByStudent.values()].map((student) => {
      const totalAttempts = student.total_questions;
      const byBloomLevel = sortBloomRows(
        [...student.by_bloom_level.values()].map((item) => ({
          ...item,
          correct_percentage: toPercentage(item.correct_count, item.total_questions),
        })),
      );
      const accuracy = toPercentage(student.correct_count, totalAttempts);
      const rankedLevels = byBloomLevel.filter((item) => item.total_questions > 0);
      const strongestBloom = rankedLevels.reduce(
        (best, item) =>
          !best || item.correct_percentage > best.correct_percentage ? item : best,
        null,
      );
      const weakestBloom = rankedLevels.reduce(
        (weakest, item) =>
          !weakest || item.correct_percentage < weakest.correct_percentage ? item : weakest,
        null,
      );

      return {
        ...student,
        correct_percentage: accuracy,
        mastery: getMasteryMeta(accuracy),
        strongest_bloom: strongestBloom,
        weakest_bloom: weakestBloom,
        by_bloom_level: byBloomLevel,
      };
    });
  }, [filteredStudents, granularRows, hasGranularData, questionById]);

  const aggregateStats = useMemo(() => {
    const totalQuestions = questionStats.length;
    const totalStudents = hasGranularData
      ? filteredStudents.length
      : Number(data?.total_students || 0);
    const totals = questionStats.reduce(
      (acc, item) => {
        acc.correct += Number(item.correct_count || 0);
        acc.incorrect += Number(item.incorrect_count || 0);
        acc.unanswered += Number(item.unanswered_count || 0);
        acc.pending += Number(item.pending_review_count || 0);
        return acc;
      },
      { correct: 0, incorrect: 0, unanswered: 0, pending: 0 },
    );

    const attempts = hasGranularData
      ? totalQuestions * totalStudents
      : totals.correct + totals.incorrect + totals.unanswered + totals.pending;

    return {
      totalQuestions,
      totalStudents,
      ...totals,
      accuracy: toPercentage(totals.correct, attempts),
      needAttention: perStudentAnalysis.filter(
        (student) => Number(student.correct_percentage || 0) < 55,
      ).length,
    };
  }, [data, filteredStudents.length, hasGranularData, perStudentAnalysis, questionStats]);

  const insight = useMemo(() => {
    const rankedRows = bloomSummary.filter((item) => item.total_questions > 0);
    const strongest = rankedRows.reduce(
      (best, item) =>
        !best || item.correct_percentage > best.correct_percentage ? item : best,
      null,
    );
    const weakest = rankedRows.reduce(
      (weakestItem, item) =>
        !weakestItem || item.correct_percentage < weakestItem.correct_percentage
          ? item
          : weakestItem,
      null,
    );

    return {
      strongest,
      weakest,
      mastery: getMasteryMeta(aggregateStats.accuracy),
    };
  }, [aggregateStats.accuracy, bloomSummary]);

  const metricItems = [
    {
      label: "Peserta Filter",
      value: aggregateStats.totalStudents,
      suffix: "siswa",
      color: "#1d4ed8",
      icon: <Users size={18} />,
    },
    {
      label: "Rata-rata Akurasi",
      value: formatPercent(aggregateStats.accuracy),
      color: "#0f766e",
      icon: <Target size={18} />,
    },
    {
      label: "Level Terkuat",
      value: insight.strongest ? getBloomCode(insight.strongest.bloom_level) : "-",
      suffix: insight.strongest
        ? formatPercent(insight.strongest.correct_percentage)
        : "",
      color: "#15803d",
      icon: <CheckCircle2 size={18} />,
    },
    {
      label: "Perlu Penguatan",
      value: insight.weakest ? getBloomCode(insight.weakest.bloom_level) : "-",
      suffix: insight.weakest ? formatPercent(insight.weakest.correct_percentage) : "",
      color: "#dc2626",
      icon: <XCircle size={18} />,
    },
  ];

  const bloomTabItems = [
    {
      key: "summary",
      label: "Ringkasan Level Bloom",
      children: (
        <BloomSummaryTable
          bloomSummary={bloomSummary}
          isLoading={isLoading}
          isMobile={isMobile}
        />
      ),
    },
    {
      key: "students",
      label: "Profil Bloom Per Siswa",
      children: (
        <BloomStudentProfileTable
          isLoading={isLoading}
          isMobile={isMobile}
          perStudentAnalysis={perStudentAnalysis}
        />
      ),
    },
    {
      key: "questions",
      label: "Level Bloom Per Soal",
      children: (
        <BloomQuestionTable
          effectiveStudentFilter={effectiveStudentFilter}
          hasGranularData={hasGranularData}
          isLoading={isLoading}
          isMobile={isMobile}
          perQuestion={perQuestion}
        />
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <style>{bloomTabsCss}</style>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <BloomHeader
            activeScopeLabel={activeScopeLabel}
            classFilter={classFilter}
            classOptions={classOptions}
            data={data}
            effectiveStudentFilter={effectiveStudentFilter}
            hasGranularData={hasGranularData}
            insight={insight}
            isMobile={isMobile}
            searchText={searchText}
            setClassFilter={setClassFilter}
            setSearchText={setSearchText}
            setStudentFilter={setStudentFilter}
            studentOptions={studentOptions}
          />

          <BloomMetrics isMobile={isMobile} metricItems={metricItems} />

          <BloomTeacherInsight
            activeScopeLabel={activeScopeLabel}
            aggregateStats={aggregateStats}
            hasGranularData={hasGranularData}
            insight={insight}
            isMobile={isMobile}
          />

          {bloomSummary.length === 0 && !isLoading ? (
            <Empty
              description='Belum ada data analitik Bloom untuk ujian ini.'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Tabs
              className='cbt-bloom-tabs'
              defaultActiveKey='summary'
              items={bloomTabItems}
              size={isMobile ? "small" : "middle"}
            />
          )}
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default BloomAnalysis;
