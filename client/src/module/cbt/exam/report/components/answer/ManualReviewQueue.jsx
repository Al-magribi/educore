import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Search,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useGetExamAiGradingLatestJobQuery,
  useGetExamStudentAnswerReportQuery,
  useStartExamAiGradingJobMutation,
} from "../../../../../../service/cbt/ApiExam";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const slugifyParam = (value = "-") =>
  String(value || "-")
    .trim()
    .replace(/\s+/g, "-");

const MANUAL_TYPE_META = {
  essay: { label: "Uraian", color: "magenta" },
  short: { label: "Jawaban Singkat", color: "cyan" },
  match: { label: "Menjodohkan", color: "geekblue" },
};

const getManualTypeKey = (typeLabel = "") => {
  const normalized = String(typeLabel).toLowerCase();
  if (normalized.includes("uraian")) return "essay";
  if (normalized.includes("singkat")) return "short";
  if (normalized.includes("cocok")) return "match";
  return "manual";
};

const ManualReviewQueue = ({
  examId,
  examName,
  isMobile: forcedMobile = false,
}) => {
  const screens = useBreakpoint();
  const isMobile = forcedMobile || !screens.md;
  const [, setSearchParams] = useSearchParams();
  const [classFilter, setClassFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [startAiGrading, { isLoading: isStartingAiGrading }] =
    useStartExamAiGradingJobMutation();

  const {
    data: report = {},
    isLoading,
    isFetching,
  } = useGetExamStudentAnswerReportQuery(
    { exam_id: examId },
    { skip: !examId },
  );

  const students = useMemo(() => report.students || [], [report.students]);
  const classes = useMemo(() => report.classes || [], [report.classes]);
  const tableLoading = isLoading || isFetching;
  const { data: aiJobLatestResponse, refetch: refetchAiLatestJob } =
    useGetExamAiGradingLatestJobQuery(
      { exam_id: examId },
      { skip: !examId, pollingInterval: 5000 },
    );
  const aiJobLatest = aiJobLatestResponse?.data || null;

  const classOptions = useMemo(() => {
    if (classes.length > 0) {
      return classes.map((item) => ({
        value: String(item.id),
        label: `${item.name || "-"} (${item.total_students || 0})`,
      }));
    }

    return [
      ...students
        .reduce((acc, student) => {
          const key = String(student.class_id || student.class_name || "");
          if (!key || acc.has(key)) return acc;
          acc.set(key, {
            value: key,
            label: student.class_name || "-",
          });
          return acc;
        }, new Map())
        .values(),
    ];
  }, [classes, students]);

  const pendingStudents = useMemo(
    () =>
      students
        .filter((student) => Number(student.pending_review_count || 0) > 0)
        .map((student, index) => {
          const pendingAnswers = (student.answers || []).filter(
            (answer) => answer.status === "pending_review",
          );
          const manualTypeCounts = pendingAnswers.reduce((acc, answer) => {
            const key = getManualTypeKey(answer.type_label);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});

          return {
            ...student,
            key: student.id,
            no: index + 1,
            pending_types: manualTypeCounts,
            pending_answers: pendingAnswers,
            pending_score_total: pendingAnswers.reduce(
              (sum, answer) => sum + Number(answer.score || 0),
              0,
            ),
          };
        }),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return pendingStudents.filter((student) => {
      const classValue = String(student.class_id || student.class_name || "");
      const matchClass =
        classFilter === "all" ? true : classValue === classFilter;
      const matchSearch = query
        ? `${student.nis || ""} ${student.name || ""} ${student.class_name || ""}`
            .toLowerCase()
            .includes(query)
        : true;

      return matchClass && matchSearch;
    });
  }, [classFilter, pendingStudents, searchText]);

  useEffect(() => {
    if (
      classFilter !== "all" &&
      !classOptions.some((item) => item.value === classFilter)
    ) {
      setClassFilter("all");
    }
  }, [classFilter, classOptions]);

  const totalPendingAnswers = useMemo(
    () =>
      filteredStudents.reduce(
        (sum, student) => sum + Number(student.pending_review_count || 0),
        0,
      ),
    [filteredStudents],
  );

  const typeSummary = useMemo(
    () =>
      filteredStudents.reduce(
        (acc, student) => {
          Object.entries(student.pending_types || {}).forEach(
            ([key, count]) => {
              acc[key] = (acc[key] || 0) + Number(count || 0);
            },
          );
          return acc;
        },
        { essay: 0, short: 0, match: 0 },
      ),
    [filteredStudents],
  );

  const openStudentReview = (student) => {
    setSearchParams({
      view: "student_answers",
      exam_id: String(examId),
      exam_name: slugifyParam(examName),
      student_id: String(student.id),
      student_name: slugifyParam(student.name),
      student_class: slugifyParam(student.class_name),
      student_nis: String(student.nis || "-"),
      manual_only: "1",
      return_tab: "manual-review",
    });
  };

  const handleStartAiGrading = async () => {
    if (!examId) return;
    try {
      const response = await startAiGrading({ exam_id: examId }).unwrap();
      message.success(response?.message || "Koreksi AI dimulai");
      refetchAiLatestJob();
    } catch (error) {
      message.error(error?.data?.message || "Gagal memulai koreksi AI");
    }
  };

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      key: "no",
      width: 68,
      align: "center",
    },
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space vertical size={0} style={{ minWidth: 0 }}>
          <Text strong ellipsis style={{ maxWidth: 260 }}>
            {record.name || "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.nis || "-"} - {record.class_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Perlu Koreksi",
      dataIndex: "pending_review_count",
      key: "pending_review_count",
      width: 130,
      align: "center",
      render: (value) => (
        <Tag
          color='gold'
          icon={<Clock3 size={12} />}
          style={{ margin: 0, borderRadius: 999 }}
        >
          {value || 0} soal
        </Tag>
      ),
    },
    {
      title: "Ringkasan Tipe",
      key: "pending_types",
      render: (_, record) => (
        <Space wrap size={6}>
          {Object.entries(record.pending_types || {}).map(([key, count]) => {
            if (!count) return null;
            const meta = MANUAL_TYPE_META[key] || {
              label: key,
              color: "default",
            };
            return (
              <Tag
                key={key}
                color={meta.color}
                style={{ margin: 0, borderRadius: 999 }}
              >
                {meta.label}: {count}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: "Nilai Saat Ini",
      dataIndex: "score",
      key: "score",
      width: 120,
      align: "center",
      render: (value) => (
        <Tag
          color={Number(value || 0) >= 75 ? "green" : "orange"}
          style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
        >
          {value || 0}
        </Tag>
      ),
    },
    {
      title: "Nilai Review",
      dataIndex: "pending_score_total",
      key: "pending_score_total",
      width: 120,
      align: "center",
      render: (value) => (
        <Tag
          color='blue'
          style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
        >
          {Number(value || 0).toFixed(2)}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      align: "center",
      render: (_, record) => (
        <Button
          type='primary'
          icon={<ArrowRight size={16} />}
          onClick={() => openStudentReview(record)}
          style={{ borderRadius: 12 }}
        >
          Koreksi
        </Button>
      ),
    },
  ];

  const metricItems = [
    {
      label: "Siswa Perlu Review",
      value: filteredStudents.length,
      color: "#2563eb",
      icon: <Users size={18} />,
    },
    {
      label: "Total Pending",
      value: totalPendingAnswers,
      color: "#d97706",
      icon: <Clock3 size={18} />,
    },
    {
      label: "Uraian",
      value: typeSummary.essay || 0,
      color: "#c026d3",
      icon: <ClipboardList size={18} />,
    },
    {
      label: "Singkat + Match",
      value: (typeSummary.short || 0) + (typeSummary.match || 0),
      color: "#0284c7",
      icon: <FileText size={18} />,
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
        <Space vertical size={18} style={{ width: "100%" }}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space vertical size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Koreksi Manual</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Daftar Jawaban Perlu Koreksi
              </Title>
              <Text type='secondary'>
                Prioritaskan siswa dengan jawaban `pending review`, lalu buka
                detail untuk memberi nilai manual.
              </Text>
            </Space>
            <Tag
              color='gold'
              icon={<CheckCircle2 size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {filteredStudents.length} siswa menunggu koreksi
            </Tag>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {metricItems.map((item) => (
              <Card
                key={item.label}
                variant='borderless'
                style={{
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Flex align='center' justify='space-between' gap={12}>
                  <Space vertical size={4}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title level={4} style={{ margin: 0, color: item.color }}>
                      {item.value}
                    </Title>
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
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder='Cari nama / NIS / kelas'
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
              />
              <Select
                value={classFilter}
                onChange={setClassFilter}
                style={{ width: isMobile ? "100%" : 220, maxWidth: "100%" }}
                options={[
                  { value: "all", label: "Semua Kelas" },
                  ...classOptions,
                ]}
                virtual={false}
              />
            </Space>

            <Flex justify='flex-end'>
              <Space align='center' wrap>
                {aiJobLatest ? (
                  <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
                    AI: {aiJobLatest.status} ({aiJobLatest.processed_items || 0}
                    /{aiJobLatest.total_items || 0})
                  </Tag>
                ) : null}
                <Button
                  type='primary'
                  icon={<Bot size={14} />}
                  loading={isStartingAiGrading}
                  disabled={
                    isStartingAiGrading ||
                    aiJobLatest?.status === "queued" ||
                    aiJobLatest?.status === "running"
                  }
                  onClick={handleStartAiGrading}
                >
                  Koreksi AI
                </Button>
              </Space>
            </Flex>
          </Flex>

          {!tableLoading && filteredStudents.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Belum ada jawaban yang perlu koreksi manual.'
            />
          ) : (
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                overflow: "hidden",
              }}
            >
              <Table
                rowKey='id'
                columns={columns}
                dataSource={filteredStudents}
                loading={tableLoading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size={isMobile ? "small" : "middle"}
                scroll={{ x: 980 }}
              />
            </div>
          )}
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ManualReviewQueue;
