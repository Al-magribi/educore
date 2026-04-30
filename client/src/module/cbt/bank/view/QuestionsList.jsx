import React, { Suspense, lazy, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Checkbox,
  message,
  Spin,
  Popconfirm,
  Flex,
  theme,
  Typography,
  Button,
  Modal,
  Space,
  Tag,
  Card,
  Tooltip,
  Empty,
  Grid,
  Alert,
  Progress,
  Tabs,
} from "antd";
import {
  Edit3,
  Trash2,
  AlertTriangle,
  BrainCircuit,
  Sparkles,
  Eye,
} from "lucide-react";
import {
  useGetQuestionsQuery,
  useDeleteQuestionMutation,
  useBulkDeleteQuestionsMutation,
  useGetAiQuestionGenerateLatestQuery,
} from "../../../../service/cbt/ApiQuestion";

import QuestionHeader from "./QuestionHeader";
import QuestionBulkActions from "./QuestionBulkActions";
import QuestionItem from "./QuestionItem";
import { exportQuestionsToDocx } from "./questionDocxExport";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

const QuestionForm = lazy(() => import("../components/question/QuestionForm"));
const ImportExcelModal = lazy(() => import("./ImportExcelModal"));
const AiGenerateQuestionModal = lazy(() => import("./AiGenerateQuestionModal"));
const AiQuestionDraftPreviewModal = lazy(
  () => import("./AiQuestionDraftPreviewModal"),
);

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const getQuestionTypeName = (type) => {
  const types = {
    1: { label: "PG Tunggal", color: "blue" },
    2: { label: "PG Multi", color: "cyan" },
    3: { label: "Essay Uraian", color: "purple" },
    4: { label: "Essay Singkat", color: "geekblue" },
    5: { label: "Benar / Salah", color: "orange" },
    6: { label: "Mencocokkan", color: "magenta" },
  };
  return types[type] || { label: "Unknown", color: "default" };
};

const QUESTION_TYPE_ORDER = [1, 2, 3, 4, 5, 6];

const getBloomLevelMeta = (level) => {
  const levels = {
    1: { short: "C1", label: "Remembering", color: "gold" },
    2: { short: "C2", label: "Understanding", color: "lime" },
    3: { short: "C3", label: "Applying", color: "green" },
    4: { short: "C4", label: "Analyzing", color: "cyan" },
    5: { short: "C5", label: "Evaluating", color: "blue" },
    6: { short: "C6", label: "Creating", color: "magenta" },
  };

  return (
    levels[level] || {
      short: "No Level",
      label: "Belum Diatur",
      color: "default",
    }
  );
};

const normalizeQuestionPreview = (value = "") => {
  if (typeof value !== "string" || !value) return "";

  const withFormulaMarkers = value.replace(
    /<span[^>]*class=["'][^"']*ql-formula[^"']*["'][^>]*data-value=["']([^"']+)["'][^>]*><\/span>/gi,
    (_, formula) => `$${formula}$`,
  );

  const withoutTags = withFormulaMarkers
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (typeof window === "undefined") return withoutTags;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = withoutTags;
  return textarea.value;
};

const QuestionPreviewText = ({ value }) => {
  const normalized = normalizeQuestionPreview(value);
  const segments = normalized.split(/(\$[^$]+\$)/g);
  const hasValidDollarPair = segments.some(
    (segment) => segment.startsWith("$") && segment.endsWith("$"),
  );
  const normalizedNoDollar = normalized.replace(/\$/g, "").trim();
  const hasLatexFallback = /\\[a-zA-Z]+|[_^{}]/.test(normalizedNoDollar);

  return (
    <div
      style={{
        fontSize: 13,
        color: "rgba(15, 23, 42, 0.62)",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-word",
        lineHeight: 1.6,
      }}
    >
      {hasValidDollarPair ? (
        segments.map((segment, idx) => {
          if (segment.startsWith("$") && segment.endsWith("$")) {
            const formula = segment.slice(1, -1).trim();
            if (!formula) return null;
            return <InlineMath key={`${idx}-${formula}`} math={formula} />;
          }
          return <span key={`${idx}-${segment}`}>{segment}</span>;
        })
      ) : hasLatexFallback ? (
        <InlineMath math={normalizedNoDollar} />
      ) : (
        <span>{normalized}</span>
      )}
    </div>
  );
};

const QuestionsList = () => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bankId = searchParams.get("bank_id");
  const bankName = searchParams.get("bank_name");

  const [selectedIds, setSelectedIds] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAiGenerateOpen, setIsAiGenerateOpen] = useState(false);
  const [isAiPreviewOpen, setIsAiPreviewOpen] = useState(false);
  const [activeAiJobId, setActiveAiJobId] = useState(null);

  const {
    data: questions = [],
    isLoading,
    refetch,
  } = useGetQuestionsQuery({ bankid: bankId }, { skip: !bankId });
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [bulkDelete] = useBulkDeleteQuestionsMutation();
  const { data: latestAiJob, refetch: refetchLatestAiJob } =
    useGetAiQuestionGenerateLatestQuery(
      { bankId },
      {
        skip: !bankId,
        pollingInterval: activeAiJobId && isAiPreviewOpen ? 0 : 8000,
      },
    );
  const aiAlertMeta = getAiJobAlertMeta(latestAiJob);
  const aiProgressPercent = latestAiJob?.total_requested
    ? Math.round(
        (Number(latestAiJob.total_generated || 0) /
          Number(latestAiJob.total_requested || 1)) *
          100,
      )
    : 0;

  const totalScore = useMemo(
    () => questions.reduce((acc, curr) => acc + (curr.score_point || 0), 0),
    [questions],
  );

  const groupedQuestions = useMemo(
    () =>
      QUESTION_TYPE_ORDER.map((type) => ({
        type,
        meta: getQuestionTypeName(type),
        questions: questions.filter(
          (question) => Number(question.q_type) === type,
        ),
      })),
    [questions],
  );

  const createTypeTabLabel = (meta, count) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: isMobile ? 36 : 40,
          height: isMobile ? 36 : 40,
          display: "grid",
          placeItems: "center",
          borderRadius: 14,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {count}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{meta.label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
            }}
          >
            {count ? `${count} soal tersedia` : "Belum ada soal"}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const openCreateForm = () => {
    setEditingItem(null);
    setIsFormVisible(true);
  };

  const handleDeleteSingle = async (id) => {
    try {
      await deleteQuestion(id).unwrap();
      message.success("Soal berhasil dihapus");
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      refetch();
    } catch {
      message.error("Gagal menghapus soal");
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: `Hapus ${selectedIds.length} soal terpilih?`,
      icon: <AlertTriangle color='red' />,
      content: "Tindakan ini tidak dapat dibatalkan.",
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await bulkDelete(selectedIds).unwrap();
          message.success(`${selectedIds.length} soal berhasil dihapus`);
          setSelectedIds([]);
          refetch();
        } catch {
          message.error("Gagal menghapus beberapa soal");
        }
      },
    });
  };

  const handleDeleteAll = () => {
    const allIds = questions.map((q) => q.id);
    if (allIds.length === 0) return;

    Modal.confirm({
      title: "Kosongkan semua soal?",
      icon: <AlertTriangle color='red' />,
      content: `Anda akan menghapus seluruh soal (${allIds.length} soal) dalam bank ini.`,
      okText: "Ya, Hapus Semua",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await bulkDelete(allIds).unwrap();
          message.success("Semua soal berhasil dihapus");
          setSelectedIds([]);
          refetch();
        } catch {
          message.error("Gagal mengosongkan soal");
        }
      },
    });
  };

  const handleDownload = async () => {
    if (!questions.length || isDownloading) return;

    setIsDownloading(true);
    try {
      await exportQuestionsToDocx({ bankName, questions });
      message.success("Dokumen Word berhasil dibuat");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      message.error("Gagal membuat dokumen Word");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderQuestionCard = (question, indexInType) => {
    const typeMeta = getQuestionTypeName(question.q_type);
    const bloomMeta = getBloomLevelMeta(question.bloom_level);
    const isSelected = selectedIds.includes(question.id);

    return (
      <Card
        key={question.id}
        variant='borderless'
        style={{
          borderRadius: 22,
          border: isSelected
            ? "1px solid rgba(59, 130, 246, 0.24)"
            : "1px solid rgba(226, 232, 240, 0.92)",
          boxShadow: isSelected
            ? "0 20px 36px rgba(37, 99, 235, 0.12)"
            : "0 10px 24px rgba(15, 23, 42, 0.05)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.94))",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Flex vertical gap={16}>
          <Flex
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={14}
            wrap
          >
            <Flex align={isMobile ? "flex-start" : "center"} gap={12} flex={1}>
              <Checkbox
                checked={isSelected}
                onChange={() => handleSelect(question.id)}
                style={{ flexShrink: 0, marginTop: isMobile ? 4 : 0 }}
              />

              <Flex align='center' gap={8} wrap='wrap'>
                <Text
                  strong
                  style={{ color: token.colorPrimary, fontSize: 15 }}
                >
                  {indexInType + 1}.
                </Text>
                <Tag
                  color={typeMeta.color}
                  style={{
                    fontSize: 10,
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 10,
                  }}
                >
                  {typeMeta.label}
                </Tag>
                <Tag
                  style={{
                    fontSize: 10,
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 10,
                    borderColor: "rgba(37, 99, 235, 0.18)",
                    color: "#1e3a8a",
                    background: "rgba(219, 234, 254, 0.55)",
                  }}
                >
                  {question.score_point} Pts
                </Tag>
                <Tooltip
                  title={
                    question.bloom_level
                      ? `Bloom Level ${bloomMeta.short} ${bloomMeta.label}`
                      : "Bloom level belum diisi"
                  }
                >
                  <Tag
                    color={bloomMeta.color}
                    style={{
                      fontSize: 10,
                      margin: 0,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      paddingInline: 10,
                    }}
                  >
                    <BrainCircuit size={12} />
                    {question.bloom_level
                      ? `${bloomMeta.short} ${bloomMeta.label}`
                      : "Tanpa Bloom"}
                  </Tag>
                </Tooltip>
              </Flex>
            </Flex>

            <Space size={6} style={{ flexShrink: 0 }}>
              <Button
                type='text'
                size='small'
                icon={<Edit3 size={16} />}
                style={{ borderRadius: 10 }}
                onClick={() => {
                  setEditingItem(question);
                  setIsFormVisible(true);
                }}
              />
              <Popconfirm
                title='Hapus soal ini?'
                onConfirm={() => handleDeleteSingle(question.id)}
              >
                <Button
                  type='text'
                  size='small'
                  danger
                  style={{ borderRadius: 10 }}
                  icon={<Trash2 size={16} />}
                />
              </Popconfirm>
            </Space>
          </Flex>

          <QuestionItem question={question} />
        </Flex>
      </Card>
    );
  };

  if (isFormVisible) {
    return (
      <Suspense
        fallback={
          <Flex justify='center' align='center' style={{ minHeight: 320 }}>
            <Spin size='large' />
          </Flex>
        }
      >
        <QuestionForm
          bankId={bankId}
          initialData={editingItem}
          onCancel={() => setIsFormVisible(false)}
          onSaveSuccess={() => {
            setIsFormVisible(false);
            refetch();
          }}
        />
      </Suspense>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Flex gap='middle' vertical>
        <QuestionHeader
          bankName={bankName}
          totalCount={questions.length}
          totalScore={totalScore}
          onBack={() => navigate("/computer-based-test/bank")}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          onImport={() => setIsImportModalOpen(true)}
          onAdd={openCreateForm}
          onDeleteAll={handleDeleteAll}
          onGenerateAi={() => setIsAiGenerateOpen(true)}
        />

        {latestAiJob && (
          <Alert
            type={aiAlertMeta.type}
            showIcon
            icon={
              latestAiJob.status === "failed" ? (
                <AlertTriangle size={16} />
              ) : (
                <Sparkles size={16} />
              )
            }
            message={aiAlertMeta.title}
            description={
              <Flex
                justify='space-between'
                align='center'
                gap={12}
                wrap='wrap'
                style={{ marginTop: 8 }}
              >
                <Space direction='vertical' size={6} style={{ flex: 1 }}>
                  <Text>
                    Job #{latestAiJob.id} berstatus{" "}
                    <strong>{latestAiJob.status}</strong>.{" "}
                    {aiAlertMeta.description}
                  </Text>
                  {aiAlertMeta.isProcessing ? (
                    <>
                      <Text type='secondary'>
                        {Number(latestAiJob.total_generated || 0)} dari{" "}
                        {Number(latestAiJob.total_requested || 0)} draft sudah
                        tersimpan di database.
                      </Text>
                      <Progress
                        percent={Math.max(0, Math.min(aiProgressPercent, 100))}
                        status='active'
                        size='small'
                        strokeColor='#1677ff'
                      />
                    </>
                  ) : latestAiJob.total_generated ? (
                    <Text type='secondary'>
                      Total draft tersimpan: {latestAiJob.total_generated}.
                    </Text>
                  ) : null}
                </Space>
                <Space wrap>
                  <Button
                    icon={<Eye size={14} />}
                    onClick={() => {
                      setActiveAiJobId(latestAiJob.id);
                      setIsAiPreviewOpen(true);
                    }}
                  >
                    {aiAlertMeta.isProcessing ? "Lihat Progress" : "Buka Draft"}
                  </Button>
                  <Button
                    disabled={aiAlertMeta.isProcessing}
                    onClick={() => {
                      setIsAiGenerateOpen(true);
                    }}
                  >
                    Generate Ulang
                  </Button>
                </Space>
              </Flex>
            }
            style={{ borderRadius: 18 }}
          />
        )}

        <QuestionBulkActions
          selectedCount={selectedIds.length}
          onCancel={() => setSelectedIds([])}
          onDelete={handleBulkDelete}
        />

        {isLoading ? (
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Flex
              vertical
              justify='center'
              align='center'
              gap={14}
              style={{ minHeight: 320, textAlign: "center" }}
            >
              <Spin size='large' />
              <Text type='secondary'>
                Memuat daftar soal dan metadata bank pertanyaan.
              </Text>
            </Flex>
          </Card>
        ) : questions.length === 0 ? (
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: isMobile ? 20 : 28 } }}
          >
            <Flex
              vertical
              align='center'
              justify='center'
              gap={10}
              style={{
                minHeight: 300,
                textAlign: "center",
                background:
                  "linear-gradient(135deg, rgba(248,250,252,0.96), rgba(239,246,255,0.86))",
                borderRadius: 20,
                border: "1px dashed rgba(148, 163, 184, 0.35)",
                padding: isMobile ? 20 : 32,
              }}
            >
              <Empty description={false} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              <Title level={4} style={{ margin: 0 }}>
                Belum ada soal dalam bank ini
              </Title>
              <Text type='secondary' style={{ maxWidth: 520 }}>
                Tambahkan soal baru atau impor dari Excel agar bank soal siap
                dipakai untuk penyusunan ujian.
              </Text>
              <Button
                type='primary'
                size='large'
                onClick={openCreateForm}
                style={{
                  marginTop: 8,
                  borderRadius: 14,
                  boxShadow: "0 14px 28px rgba(37, 99, 235, 0.22)",
                }}
              >
                Tambah Soal Pertama
              </Button>
            </Flex>
          </Card>
        ) : (
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.94))",
            }}
            styles={{ body: { padding: isMobile ? 14 : 16 } }}
          >
            <Flex
              vertical
              gap={6}
              style={{ marginBottom: 18, padding: isMobile ? 6 : 8 }}
            >
              <Text
                strong
                style={{ fontSize: isMobile ? 15 : 16, color: "#0f172a" }}
              >
                Daftar Pertanyaan
              </Text>
              <Text type='secondary'>
                Tinjau semua soal per tipe dalam tampilan tab yang lebih rapi,
                terbuka, dan nyaman dipakai di berbagai ukuran layar.
              </Text>
            </Flex>

            <Tabs
              defaultActiveKey={String(
                groupedQuestions.find((item) => item.questions.length)?.type ||
                  1,
              )}
              size={isMobile ? "middle" : "large"}
              tabBarGutter={12}
              tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
              items={groupedQuestions.map((group) => ({
                key: String(group.type),
                label: createTypeTabLabel(group.meta, group.questions.length),
                children: group.questions.length ? (
                  <Flex vertical gap={16}>
                    <Flex
                      justify='space-between'
                      align={isMobile ? "flex-start" : "center"}
                      gap={12}
                      wrap
                      style={{
                        padding: isMobile ? "10px 12px" : "14px 16px",
                        borderRadius: 18,
                        background:
                          "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(240,253,244,0.9))",
                        border: "1px solid rgba(191, 219, 254, 0.85)",
                      }}
                    >
                      <Flex vertical gap={4}>
                        <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
                          {group.meta.label}
                        </Text>
                        <Text type='secondary'>
                          {group.questions.length} soal siap ditinjau dalam
                          kategori ini.
                        </Text>
                      </Flex>
                      <Tag
                        color={group.meta.color}
                        style={{
                          margin: 0,
                          borderRadius: 999,
                          paddingInline: 12,
                          paddingBlock: 4,
                          fontWeight: 600,
                        }}
                      >
                        Total {group.questions.length}
                      </Tag>
                    </Flex>

                    {group.questions.map((question, index) =>
                      renderQuestionCard(question, index),
                    )}
                  </Flex>
                ) : (
                  <Card
                    variant='borderless'
                    style={{
                      borderRadius: 20,
                      background:
                        "linear-gradient(135deg, rgba(248,250,252,0.96), rgba(239,246,255,0.88))",
                      border: "1px dashed rgba(148, 163, 184, 0.35)",
                    }}
                    styles={{ body: { padding: isMobile ? 24 : 32 } }}
                  >
                    <Flex
                      vertical
                      align='center'
                      justify='center'
                      gap={10}
                      style={{ textAlign: "center", minHeight: 220 }}
                    >
                      <Empty
                        description={false}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                      <Title level={5} style={{ margin: 0 }}>
                        Belum ada soal {group.meta.label}
                      </Title>
                      <Text type='secondary' style={{ maxWidth: 420 }}>
                        Tambahkan soal baru pada tipe ini agar struktur bank
                        soal lebih lengkap dan mudah dikelola.
                      </Text>
                      <Button
                        type='primary'
                        onClick={openCreateForm}
                        style={{ borderRadius: 12 }}
                      >
                        Tambah Soal
                      </Button>
                    </Flex>
                  </Card>
                ),
              }))}
            />
          </Card>
        )}
      </Flex>

      {isImportModalOpen && (
        <Suspense fallback={null}>
          <ImportExcelModal
            visible={isImportModalOpen}
            onCancel={() => setIsImportModalOpen(false)}
            bankId={bankId}
            onSuccess={() => {
              refetch();
              setIsImportModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {isAiGenerateOpen && (
        <Suspense fallback={null}>
          <AiGenerateQuestionModal
            open={isAiGenerateOpen}
            bankId={bankId}
            onCancel={() => setIsAiGenerateOpen(false)}
            onStarted={(jobId) => {
              setIsAiGenerateOpen(false);
              if (jobId) {
                setActiveAiJobId(jobId);
                setIsAiPreviewOpen(true);
              }
              refetchLatestAiJob();
            }}
          />
        </Suspense>
      )}

      {isAiPreviewOpen && activeAiJobId && (
        <Suspense fallback={null}>
          <AiQuestionDraftPreviewModal
            open={isAiPreviewOpen}
            bankId={bankId}
            jobId={activeAiJobId}
            onClose={() => setIsAiPreviewOpen(false)}
            onRegenerate={() => {
              setIsAiPreviewOpen(false);
              setIsAiGenerateOpen(true);
            }}
            onQuestionsChanged={() => {
              refetch();
              refetchLatestAiJob();
            }}
          />
        </Suspense>
      )}
    </MotionDiv>
  );
};

const getAiJobAlertMeta = (job) => {
  if (!job) {
    return {
      type: "info",
      title: "Draft AI",
      description: "",
      isProcessing: false,
    };
  }

  switch (job.status) {
    case "queued":
      return {
        type: "info",
        title: "Generate Soal AI Masuk Antrian",
        description:
          "Permintaan sudah diterima dan sedang menunggu giliran diproses.",
        isProcessing: true,
      };
    case "running":
      return {
        type: "info",
        title: "Generate Soal AI Sedang Berjalan",
        description:
          "AI sedang menyusun draft soal. Mohon tunggu, hasil akan muncul otomatis saat proses selesai.",
        isProcessing: true,
      };
    case "completed":
      return {
        type: "success",
        title: "Draft AI Siap Direview",
        description:
          "Draft soal AI sudah selesai dibuat. Silakan buka draft untuk review, edit, dan approve.",
        isProcessing: false,
      };
    case "approved":
      return {
        type: "success",
        title: "Draft AI Sudah Dipakai",
        description:
          "Semua draft pada job terakhir sudah di-approve ke bank soal.",
        isProcessing: false,
      };
    case "discarded":
      return {
        type: "warning",
        title: "Draft AI Sudah Dibuang",
        description:
          "Draft pada job terakhir sudah dibuang dan tidak akan dipakai.",
        isProcessing: false,
      };
    case "failed":
      return {
        type: "error",
        title: "Generate Soal AI Gagal",
        description:
          job.error_message ||
          "Proses generate soal AI gagal. Silakan cek konfigurasi lalu coba lagi.",
        isProcessing: false,
      };
    default:
      return {
        type: "info",
        title: "Draft AI Terakhir",
        description: `Job #${job.id} berstatus ${job.status}.`,
        isProcessing: false,
      };
  }
};

export default QuestionsList;
