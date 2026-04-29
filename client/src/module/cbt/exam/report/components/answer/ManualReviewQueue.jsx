import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  message,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
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
  LoaderCircle,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useFinalizeExamStudentAnswerReviewMutation,
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
};

const getManualTypeKey = (typeLabel = "") => {
  const normalized = String(typeLabel).toLowerCase();
  if (normalized.includes("uraian")) return "essay";
  if (normalized.includes("singkat")) return "short";
  return "manual";
};

const getFriendlyAiErrorMessage = (errorMessage) => {
  const message = String(errorMessage || "").trim();
  if (!message) return "Koreksi AI gagal diproses.";
  if (message.toLowerCase().includes("nan")) {
    return "Koreksi AI gagal karena antrian sebelumnya tidak valid. Silakan jalankan ulang Koreksi AI.";
  }
  return message;
};

const getAiJobFeedback = (job) => {
  if (!job) return null;

  const total = Number(job.total_items || 0);
  const processed = Number(job.processed_items || 0);
  const success = Number(job.success_items || 0);
  const failed = Number(job.failed_items || 0);
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  if (job.status === "failed") {
    return {
      type: "error",
      color: "red",
      icon: <XCircle size={14} />,
      label: "AI gagal",
      title: "Koreksi AI gagal",
      description: getFriendlyAiErrorMessage(job.error_message),
      progress,
    };
  }

  if (job.status === "completed") {
    const hasFailedItems = failed > 0;
    return {
      type: hasFailedItems ? "warning" : "success",
      color: hasFailedItems ? "orange" : "green",
      icon: <CheckCircle2 size={14} />,
      label: hasFailedItems ? "AI selesai sebagian" : "AI selesai",
      title: hasFailedItems
        ? "Koreksi AI selesai dengan beberapa gagal"
        : "Koreksi AI berhasil",
      description: `${success} jawaban berhasil dinilai${
        failed ? `, ${failed} jawaban gagal` : ""
      }.`,
      progress: 100,
    };
  }

  if (job.status === "running") {
    return {
      type: "info",
      color: "blue",
      icon: <LoaderCircle size={14} />,
      label: "AI berjalan",
      title: "Koreksi AI sedang berjalan",
      description: `${processed}/${total} jawaban sudah diproses. Guru boleh menutup tab, proses tetap berjalan di server.`,
      progress,
    };
  }

  return {
    type: "info",
    color: "blue",
    icon: <Clock3 size={14} />,
    label: "AI antre",
    title: "Koreksi AI masuk antrian",
    description: `${processed}/${total} jawaban sudah diproses. Worker akan mengambil antrian dari server.`,
    progress,
  };
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
  const [activeTab, setActiveTab] = useState("review");
  const [notifiedAiJobKey, setNotifiedAiJobKey] = useState("");
  const [isFinalizingAll, setIsFinalizingAll] = useState(false);
  const [startAiGrading, { isLoading: isStartingAiGrading }] =
    useStartExamAiGradingJobMutation();
  const [finalizeReview] = useFinalizeExamStudentAnswerReviewMutation();

  const {
    data: report = {},
    isLoading,
    isFetching,
    refetch: refetchReport,
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
  const aiJobFeedback = useMemo(
    () => getAiJobFeedback(aiJobLatest),
    [aiJobLatest],
  );

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

  const manualReviewStudents = useMemo(
    () =>
      students
        .map((student, index) => {
          const manualAnswers = (student.answers || []).filter((answer) =>
            ["essay", "short"].includes(
              getManualTypeKey(answer.type_label || answer.type),
            ),
          );
          const reviewAnswers = manualAnswers.filter((answer) => {
            const reviewStatus = String(
              answer.reviewStatus || "",
            ).toLowerCase();
            return reviewStatus !== "finalized";
          });
          const finalizedAnswers = manualAnswers.filter((answer) => {
            const reviewStatus = String(
              answer.reviewStatus || "",
            ).toLowerCase();
            return reviewStatus === "finalized";
          });
          const reviewTypeCounts = reviewAnswers.reduce((acc, answer) => {
            const key = getManualTypeKey(answer.type_label);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          const finalizedTypeCounts = finalizedAnswers.reduce((acc, answer) => {
            const key = getManualTypeKey(answer.type_label);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});

          return {
            ...student,
            key: student.id,
            no: index + 1,
            review_question_ids: reviewAnswers.map(
              (answer) => answer.question_id,
            ),
            review_count: reviewAnswers.length,
            review_types: reviewTypeCounts,
            review_score_total: reviewAnswers.reduce(
              (sum, answer) => sum + Number(answer.score || 0),
              0,
            ),
            finalized_question_ids: finalizedAnswers.map(
              (answer) => answer.question_id,
            ),
            finalized_count: finalizedAnswers.length,
            finalized_types: finalizedTypeCounts,
            finalized_score_total: finalizedAnswers.reduce(
              (sum, answer) => sum + Number(answer.score || 0),
              0,
            ),
          };
        })
        .filter(
          (student) =>
            Number(student.review_count || 0) > 0 ||
            Number(student.finalized_count || 0) > 0,
        ),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return manualReviewStudents.filter((student) => {
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
  }, [classFilter, manualReviewStudents, searchText]);

  const activeStudents = useMemo(
    () =>
      filteredStudents.filter((student) =>
        activeTab === "finalisasi"
          ? Number(student.finalized_count || 0) > 0
          : Number(student.review_count || 0) > 0,
      ),
    [activeTab, filteredStudents],
  );

  useEffect(() => {
    if (
      classFilter !== "all" &&
      !classOptions.some((item) => item.value === classFilter)
    ) {
      setClassFilter("all");
    }
  }, [classFilter, classOptions]);

  useEffect(() => {
    if (
      !aiJobLatest?.id ||
      !["completed", "failed"].includes(aiJobLatest.status)
    ) {
      return;
    }

    const notifyKey = `${aiJobLatest.id}-${aiJobLatest.status}-${aiJobLatest.updated_at || ""}`;
    if (notifyKey === notifiedAiJobKey) return;

    if (aiJobLatest.status === "failed") {
      message.error(getFriendlyAiErrorMessage(aiJobLatest.error_message));
    }

    setNotifiedAiJobKey(notifyKey);
  }, [aiJobLatest, notifiedAiJobKey]);

  const totalPendingAnswers = useMemo(
    () =>
      activeStudents.reduce(
        (sum, student) =>
          sum +
          Number(
            activeTab === "finalisasi"
              ? student.finalized_count || 0
              : student.review_count || 0,
          ),
        0,
      ),
    [activeStudents, activeTab],
  );

  const typeSummary = useMemo(
    () =>
      activeStudents.reduce(
        (acc, student) => {
          const typeCounts =
            activeTab === "finalisasi"
              ? student.finalized_types
              : student.review_types;
          Object.entries(typeCounts || {}).forEach(([key, count]) => {
            acc[key] = (acc[key] || 0) + Number(count || 0);
          });
          return acc;
        },
        { essay: 0, short: 0 },
      ),
    [activeStudents, activeTab],
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
      manual_status: activeTab,
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
      message.error(getFriendlyAiErrorMessage(error?.data?.message));
    }
  };

  const handleFinalizeAll = async () => {
    if (!examId || activeTab !== "review" || activeStudents.length < 1) return;

    const targets = activeStudents.flatMap((student) =>
      (student.review_question_ids || []).map((questionId) => ({
        studentId: student.id,
        questionId,
      })),
    );

    if (targets.length < 1) {
      message.warning("Tidak ada soal yang perlu difinalisasi.");
      return;
    }

    setIsFinalizingAll(true);
    const results = await Promise.allSettled(
      targets.map((target) =>
        finalizeReview({
          exam_id: examId,
          student_id: target.studentId,
          question_id: target.questionId,
        }).unwrap(),
      ),
    );
    setIsFinalizingAll(false);

    const successCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const errorCount = results.length - successCount;

    if (successCount > 0) {
      message.success(
        `${successCount} soal berhasil difinalisasi untuk ${activeStudents.length} siswa.`,
      );
    }
    if (errorCount > 0) {
      message.error(`${errorCount} soal gagal difinalisasi.`);
    }

    refetchReport();
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
      title: activeTab === "finalisasi" ? "Sudah Final" : "Perlu Koreksi",
      dataIndex:
        activeTab === "finalisasi" ? "finalized_count" : "review_count",
      key: activeTab === "finalisasi" ? "finalized_count" : "review_count",
      width: 130,
      align: "center",
      render: (value) => (
        <Tag
          color={activeTab === "finalisasi" ? "green" : "gold"}
          icon={
            activeTab === "finalisasi" ? (
              <CheckCircle2 size={12} />
            ) : (
              <Clock3 size={12} />
            )
          }
          style={{ margin: 0, borderRadius: 999 }}
        >
          {value || 0} soal
        </Tag>
      ),
    },
    {
      title: "Ringkasan Tipe",
      key: `${activeTab}_types`,
      render: (_, record) => (
        <Space wrap size={6}>
          {Object.entries(
            activeTab === "finalisasi"
              ? record.finalized_types || {}
              : record.review_types || {},
          ).map(([key, count]) => {
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
      title: activeTab === "finalisasi" ? "Nilai Final" : "Nilai Review",
      dataIndex:
        activeTab === "finalisasi"
          ? "finalized_score_total"
          : "review_score_total",
      key:
        activeTab === "finalisasi"
          ? "finalized_score_total"
          : "review_score_total",
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
          Nilai
        </Button>
      ),
    },
  ];

  const metricItems = [
    {
      label:
        activeTab === "finalisasi" ? "Siswa Sudah Final" : "Siswa Perlu Review",
      value: activeStudents.length,
      color: "#2563eb",
      icon: <Users size={18} />,
    },
    {
      label: activeTab === "finalisasi" ? "Total Final" : "Total Pending",
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
      label: "Jawaban Singkat",
      value: typeSummary.short || 0,
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
                Daftar Review dan Finalisasi Manual
              </Title>
              <Text type='secondary'>
                Tab `Review` menampilkan soal yang belum final. Tab `Finalisasi`
                menampilkan soal yang sudah final, dan guru tetap bisa memberi
                nilai di keduanya.
              </Text>
            </Space>
            <Tag
              color={activeTab === "finalisasi" ? "green" : "gold"}
              icon={<CheckCircle2 size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {activeStudents.length} siswa
            </Tag>
          </Flex>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "review",
                label: `Review (${manualReviewStudents.filter((student) => Number(student.review_count || 0) > 0).length})`,
              },
              {
                key: "finalisasi",
                label: `Finalisasi (${manualReviewStudents.filter((student) => Number(student.finalized_count || 0) > 0).length})`,
              },
            ]}
          />

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

            <Space>
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

              <Button
                onClick={handleFinalizeAll}
                loading={isFinalizingAll}
                disabled={activeTab !== "review" || activeStudents.length < 1}
              >
                Finalisasi
              </Button>
            </Space>
          </Flex>

          {aiJobFeedback ? (
            <Alert
              type={aiJobFeedback.type}
              showIcon
              message={
                <Flex
                  justify='space-between'
                  align={isMobile ? "stretch" : "center"}
                  gap={12}
                  style={{ flexDirection: isMobile ? "column" : "row" }}
                >
                  <Space vertical size={2} style={{ minWidth: 0 }}>
                    <Text strong>{aiJobFeedback.title}</Text>
                    <Text type='secondary'>{aiJobFeedback.description}</Text>
                  </Space>
                  <Progress
                    percent={aiJobFeedback.progress}
                    size='small'
                    status={
                      aiJobLatest?.status === "failed" ? "exception" : undefined
                    }
                    style={{ width: isMobile ? "100%" : 180 }}
                  />
                </Flex>
              }
              style={{ borderRadius: 14 }}
            />
          ) : null}

          {!tableLoading && activeStudents.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                activeTab === "finalisasi"
                  ? "Belum ada jawaban yang sudah final."
                  : "Belum ada jawaban yang perlu koreksi manual."
              }
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
                dataSource={activeStudents}
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
