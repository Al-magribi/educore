import React, { useMemo, useState } from "react";
import {
  Card,
  Empty,
  Flex,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Search,
  Target,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const normalizeQuestionText = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levelColorMap = {
  1: "gold",
  2: "lime",
  3: "green",
  4: "cyan",
  5: "blue",
  6: "magenta",
};

const statusMetaMap = {
  correct: { label: "Benar", color: "green", textColor: "#15803d" },
  incorrect: { label: "Salah", color: "red", textColor: "#dc2626" },
  unanswered: { label: "Kosong", color: "default", textColor: "#64748b" },
  pending_review: { label: "Pending", color: "gold", textColor: "#d97706" },
};

const metricCardStyle = {
  borderRadius: 18,
  background: "#f8fafc",
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.14)",
};

const sectionStyle = {
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  overflow: "hidden",
};

const getLevelKey = (level) => (level === null || level === undefined ? "none" : String(level));

const getBloomCode = (level) => (level ? `C${level}` : "N/A");

const getBloomName = (record = {}) => {
  const label = String(record.bloom_label || "Tanpa Level");
  if (!record.bloom_level) return label;
  return label.replace(new RegExp(`^C${record.bloom_level}\\s*`, "i"), "") || label;
};

const getBloomTitle = (record = {}) =>
  record.bloom_level
    ? `${getBloomCode(record.bloom_level)} ${getBloomName(record)}`
    : getBloomName(record);

const createStats = () => ({
  total_questions: 0,
  total_students: 0,
  correct_count: 0,
  incorrect_count: 0,
  unanswered_count: 0,
  pending_review_count: 0,
});

const addStatus = (stats, status) => {
  if (status === "correct") stats.correct_count += 1;
  else if (status === "incorrect") stats.incorrect_count += 1;
  else if (status === "pending_review") stats.pending_review_count += 1;
  else stats.unanswered_count += 1;
};

const toPercentage = (part, total) =>
  total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const getMasteryMeta = (value) => {
  const percentage = Number(value || 0);
  if (percentage >= 85) return { label: "Sangat kuat", color: "green" };
  if (percentage >= 70) return { label: "Kuat", color: "cyan" };
  if (percentage >= 55) return { label: "Cukup", color: "blue" };
  if (percentage >= 40) return { label: "Perlu penguatan", color: "orange" };
  return { label: "Prioritas remedial", color: "red" };
};

const getTeachingFocus = (value) => {
  const percentage = Number(value || 0);
  if (percentage >= 85) return "Pertahankan dan beri pengayaan";
  if (percentage >= 70) return "Latihan variasi soal";
  if (percentage >= 55) return "Latihan terarah";
  if (percentage >= 40) return "Ulang konsep kunci";
  return "Remedial prasyarat";
};

const sortBloomRows = (rows) =>
  [...rows].sort((a, b) => {
    const levelA = a.bloom_level ?? 999;
    const levelB = b.bloom_level ?? 999;
    return levelA - levelB;
  });

const getStudentId = (student) => String(student?.id ?? student?.student_id ?? "");
const getClassValue = (item) => String(item?.class_id ?? item?.id ?? item?.class_name ?? item?.name ?? "");

const BloomTag = ({ record, compact = false }) => (
  <Space size={compact ? 4 : 8} wrap>
    <Tag
      color={levelColorMap[record?.bloom_level] || "default"}
      style={{ margin: 0, borderRadius: 999 }}
    >
      {getBloomCode(record?.bloom_level)}
    </Tag>
    {!compact ? <Text strong>{getBloomName(record)}</Text> : null}
  </Space>
);

const BloomAnalysis = ({
  data,
  isLoading = false,
  isMobile = false,
}) => {
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");

  const questions = useMemo(() => data?.per_question || [], [data]);
  const granularRows = useMemo(
    () => data?.student_question_results || [],
    [data],
  );

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

  const studentOptions = useMemo(() => {
    return students
      .filter((student) => {
        if (classFilter === "all") return true;
        return getClassValue(student) === classFilter;
      })
      .map((student) => ({
        value: getStudentId(student),
        label: `${student.name} - ${student.nis || "-"} (${student.class_name || "-"})`,
      }));
  }, [students, classFilter]);

  const selectedStudent = useMemo(() => {
    if (studentFilter === "all") return null;
    const selected = students.find((student) => getStudentId(student) === studentFilter);
    if (!selected) return null;
    if (classFilter !== "all" && getClassValue(selected) !== classFilter) return null;
    return selected;
  }, [classFilter, studentFilter, students]);

  const effectiveStudentFilter = selectedStudent
    ? getStudentId(selectedStudent)
    : "all";

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

  const questionById = useMemo(() => {
    return new Map(questions.map((question) => [question.id, question]));
  }, [questions]);

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
        correct_percentage: toPercentage(
          current.correct_count,
          filteredStudents.length,
        ),
      };
    });
  }, [
    filteredStudentIds,
    filteredStudents.length,
    granularRows,
    hasGranularData,
    questions,
    effectiveStudentFilter,
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
      const levelText = `${getBloomTitle(item)} ${item.q_type || ""}`.toLowerCase();
      const questionText = normalizeQuestionText(item.question).toLowerCase();
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
          !weakest || item.correct_percentage < weakest.correct_percentage
            ? item
            : weakest,
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
      {
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        pending: 0,
      },
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

  const summaryColumns = [
    {
      title: "Bloom Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 220,
      render: (_, record) => <BloomTag record={record} />,
    },
    {
      title: "Jumlah Soal",
      dataIndex: "total_questions",
      key: "total_questions",
      width: 120,
      align: "center",
    },
    {
      title: "Benar",
      dataIndex: "correct_count",
      key: "correct_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: "#15803d" }}>{value}</Text>,
    },
    {
      title: "Salah",
      dataIndex: "incorrect_count",
      key: "incorrect_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: "#dc2626" }}>{value}</Text>,
    },
    {
      title: "Kosong",
      dataIndex: "unanswered_count",
      key: "unanswered_count",
      width: 100,
      align: "center",
    },
    {
      title: "Pending",
      dataIndex: "pending_review_count",
      key: "pending_review_count",
      width: 100,
      align: "center",
    },
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 180,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor="#2563eb"
          showInfo
        />
      ),
    },
    {
      title: "Interpretasi",
      key: "interpretation",
      width: 170,
      render: (_, record) => {
        const meta = getMasteryMeta(record.correct_percentage);
        return (
          <Tag color={meta.color} style={{ margin: 0, borderRadius: 999 }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Arah Tindak Lanjut",
      key: "follow_up",
      width: 210,
      render: (_, record) => (
        <Text style={{ color: "#475569" }}>
          {getTeachingFocus(record.correct_percentage)}
        </Text>
      ),
    },
  ];

  const studentColumns = [
    {
      title: "Siswa",
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (value, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{value}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.nis || "-"} - {record.class_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 180,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor="#0f766e"
          showInfo
        />
      ),
    },
    {
      title: "Status",
      key: "mastery",
      width: 170,
      render: (_, record) => (
        <Tag color={record.mastery.color} style={{ margin: 0, borderRadius: 999 }}>
          {record.mastery.label}
        </Tag>
      ),
    },
    {
      title: "Terkuat",
      key: "strongest_bloom",
      width: 160,
      render: (_, record) =>
        record.strongest_bloom ? (
          <Space size={6}>
            <BloomTag record={record.strongest_bloom} compact />
            <Text>{formatPercent(record.strongest_bloom.correct_percentage)}</Text>
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Butuh Penguatan",
      key: "weakest_bloom",
      width: 190,
      render: (_, record) =>
        record.weakest_bloom ? (
          <Space size={6}>
            <BloomTag record={record.weakest_bloom} compact />
            <Text>{formatPercent(record.weakest_bloom.correct_percentage)}</Text>
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Profil Level",
      key: "profile",
      width: 360,
      render: (_, record) => (
        <Space size={[4, 6]} wrap>
          {record.by_bloom_level.map((item) => (
            <Tooltip
              key={`${record.student_id}-${getLevelKey(item.bloom_level)}`}
              title={`${getBloomTitle(item)}: ${formatPercent(item.correct_percentage)}`}
            >
              <Tag
                color={levelColorMap[item.bloom_level] || "default"}
                style={{ margin: 0, borderRadius: 999 }}
              >
                {getBloomCode(item.bloom_level)} {formatPercent(item.correct_percentage)}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    },
  ];

  const questionColumns = [
    {
      title: "No",
      key: "no",
      width: 60,
      align: "center",
      render: (_, record, index) => record.no || index + 1,
    },
    {
      title: "Soal",
      dataIndex: "question",
      key: "question",
      width: 360,
      render: (value) => {
        const text = normalizeQuestionText(value);
        const shortText = text.length > 160 ? `${text.slice(0, 160)}...` : text;

        return (
          <Tooltip title={text}>
            <Text>{shortText || "-"}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 190,
      render: (_, record) => <BloomTag record={record} />,
    },
    ...(effectiveStudentFilter !== "all" && hasGranularData
      ? [
          {
            title: "Status Siswa",
            dataIndex: "student_status",
            key: "student_status",
            width: 140,
            align: "center",
            render: (value) => {
              const meta = statusMetaMap[value] || statusMetaMap.unanswered;
              return (
                <Tag color={meta.color} style={{ margin: 0, borderRadius: 999 }}>
                  {meta.label}
                </Tag>
              );
            },
          },
        ]
      : [
          {
            title: "Benar",
            dataIndex: "correct_count",
            key: "correct_count",
            width: 90,
            align: "center",
            render: (value) => <Text style={{ color: "#15803d" }}>{value}</Text>,
          },
          {
            title: "Salah",
            dataIndex: "incorrect_count",
            key: "incorrect_count",
            width: 90,
            align: "center",
            render: (value) => <Text style={{ color: "#dc2626" }}>{value}</Text>,
          },
          {
            title: "Kosong",
            dataIndex: "unanswered_count",
            key: "unanswered_count",
            width: 90,
            align: "center",
          },
          {
            title: "Pending",
            dataIndex: "pending_review_count",
            key: "pending_review_count",
            width: 90,
            align: "center",
          },
        ]),
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 160,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor="#0f766e"
          showInfo
        />
      ),
    },
  ];

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
      suffix: insight.strongest ? formatPercent(insight.strongest.correct_percentage) : "",
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
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <Space direction='vertical' size={8} style={{ width: "100%" }}>
            <Text strong>Ringkasan Level Bloom</Text>
            <div style={sectionStyle}>
              <Table
                rowKey={(record) => `${record.bloom_level ?? "none"}-${record.bloom_label}`}
                columns={summaryColumns}
                dataSource={bloomSummary}
                loading={isLoading}
                pagination={false}
                size={isMobile ? "small" : "middle"}
                scroll={isMobile ? { x: 1380 } : undefined}
              />
            </div>
          </Space>

          {hasGranularData ? (
            <Space direction='vertical' size={8} style={{ width: "100%" }}>
              <Text strong>Profil Bloom Per Siswa</Text>
              <div style={sectionStyle}>
                <Table
                  rowKey='student_id'
                  columns={studentColumns}
                  dataSource={perStudentAnalysis}
                  loading={isLoading}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  size={isMobile ? "small" : "middle"}
                  scroll={isMobile ? { x: 1320 } : undefined}
                />
              </div>
            </Space>
          ) : null}
        </Space>
      ),
    },
    {
      key: "questions",
      label: "Level Bloom Per Soal",
      children: (
        <Space direction='vertical' size={8} style={{ width: "100%" }}>
          <Text strong>
            Level Bloom Per Soal {effectiveStudentFilter !== "all" ? "Untuk Siswa Terpilih" : ""}
          </Text>
          <div style={sectionStyle}>
            <Table
              rowKey='id'
              columns={questionColumns}
              dataSource={perQuestion}
              loading={isLoading}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              size={isMobile ? "small" : "middle"}
              scroll={isMobile ? { x: 1180 } : undefined}
            />
          </div>
        </Space>
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            gap={12}
            wrap='wrap'
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Analisis Bloom</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Peta Kekuatan Kognitif Kelas dan Siswa
              </Title>
              <Text type='secondary'>
                Ringkasan ini membantu guru melihat level Bloom yang sudah kuat,
                level yang perlu diperkuat, dan siswa yang butuh tindak lanjut.
              </Text>
            </Space>
            <Tag
              color='blue'
              icon={<BrainCircuit size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {data?.total_students || 0} peserta dianalisis
            </Tag>
          </Flex>

          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space
              wrap
              style={{
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <Select
                value={classFilter}
                onChange={(value) => {
                  setClassFilter(value);
                  setStudentFilter("all");
                }}
                style={{ width: isMobile ? "100%" : 190, maxWidth: "100%" }}
                options={[
                  { value: "all", label: "Semua Kelas" },
                  ...classOptions.map((item) => ({
                    value: item.value,
                    label: `${item.label}${item.total_students ? ` (${item.total_students})` : ""}`,
                  })),
                ]}
                disabled={!hasGranularData}
                virtual={false}
              />
              <Select
                showSearch
                value={effectiveStudentFilter}
                onChange={setStudentFilter}
                style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
                optionFilterProp='label'
                options={[
                  { value: "all", label: "Semua Siswa" },
                  ...studentOptions,
                ]}
                disabled={!hasGranularData}
                virtual={false}
              />
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder='Cari teks soal atau level Bloom'
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
              />
            </Space>
            <Tag
              color={insight.mastery.color}
              icon={<UserRound size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              Fokus: {activeScopeLabel}
            </Tag>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {metricItems.map((item) => (
              <Card
                key={item.label}
                variant='borderless'
                style={metricCardStyle}
                styles={{ body: { padding: 16 } }}
              >
                <Flex align='center' justify='space-between' gap={12}>
                  <Space direction='vertical' size={4}>
                    <Text type='secondary'>{item.label}</Text>
                    <Space size={6} align='baseline'>
                      <Title level={4} style={{ margin: 0, color: item.color }}>
                        {item.value}
                      </Title>
                      {item.suffix ? (
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {item.suffix}
                        </Text>
                      ) : null}
                    </Space>
                  </Space>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            ))}
          </div>

          <div
            style={{
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              padding: isMobile ? 14 : 16,
            }}
          >
            <Flex
              align={isMobile ? "stretch" : "center"}
              justify='space-between'
              gap={12}
              wrap='wrap'
              style={{ flexDirection: isMobile ? "column" : "row" }}
            >
              <Space direction='vertical' size={4} style={{ maxWidth: 760 }}>
                <Text strong>Ringkasan Guru - {activeScopeLabel}</Text>
                <Text type='secondary'>
                  Akurasi saat ini {formatPercent(aggregateStats.accuracy)} dengan
                  status {insight.mastery.label.toLowerCase()}.
                  {insight.strongest
                    ? ` Level paling kuat adalah ${getBloomTitle(insight.strongest)} (${formatPercent(insight.strongest.correct_percentage)}).`
                    : ""}
                  {insight.weakest
                    ? ` Prioritas penguatan ada pada ${getBloomTitle(insight.weakest)} (${formatPercent(insight.weakest.correct_percentage)}).`
                    : ""}
                </Text>
              </Space>
              <Space size={[6, 6]} wrap>
                <Tag
                  color='gold'
                  icon={<Clock3 size={12} />}
                  style={{ margin: 0, borderRadius: 999 }}
                >
                  Pending: {aggregateStats.pending}
                </Tag>
                {hasGranularData ? (
                  <Tag color='red' style={{ margin: 0, borderRadius: 999 }}>
                    Perlu perhatian: {aggregateStats.needAttention} siswa
                  </Tag>
                ) : null}
              </Space>
            </Flex>
          </div>

          {bloomSummary.length === 0 && !isLoading ? (
            <Empty
              description='Belum ada data analitik Bloom untuk ujian ini.'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Tabs
              defaultActiveKey='summary'
              items={bloomTabItems}
              size={isMobile ? "small" : "middle"}
              tabBarGutter={isMobile ? 8 : 16}
            />
          )}
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default BloomAnalysis;
