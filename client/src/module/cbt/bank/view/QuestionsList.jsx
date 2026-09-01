import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Checkbox,
  message,
  Spin,
  Popconfirm,
  Flex,
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
} from 'antd';
import { Edit3, Trash2, AlertTriangle, BrainCircuit, Sparkles, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useGetQuestionsQuery,
  useDeleteQuestionMutation,
  useBulkDeleteQuestionsMutation,
  useGetAiQuestionGenerateLatestQuery,
} from '../../../../service/cbt/ApiQuestion';

import QuestionHeader from './QuestionHeader';
import QuestionBulkActions from './QuestionBulkActions';
import QuestionItem from './QuestionItem';
import QuestionNavigator from './QuestionNavigator';
import { exportQuestionsToDocx } from './questionDocxExport';

const QuestionForm = lazy(() => import('../components/question/QuestionForm'));
const ImportExcelModal = lazy(() => import('./ImportExcelModal'));
const AiGenerateQuestionModal = lazy(() => import('./AiGenerateQuestionModal'));
const AiQuestionDraftPreviewModal = lazy(() => import('./AiQuestionDraftPreviewModal'));

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const getQuestionTypeName = (type) => {
  const types = {
    1: { label: 'PG Tunggal', color: 'blue' },
    2: { label: 'PG Multi', color: 'cyan' },
    3: { label: 'Essay Uraian', color: 'purple' },
    4: { label: 'Essay Singkat', color: 'geekblue' },
    5: { label: 'Benar / Salah', color: 'orange' },
    6: { label: 'Mencocokkan', color: 'magenta' },
  };
  return types[type] || { label: 'Unknown', color: 'default' };
};

const getBloomLevelMeta = (level) => {
  const levels = {
    1: { short: 'C1', label: 'Remembering', color: 'gold' },
    2: { short: 'C2', label: 'Understanding', color: 'lime' },
    3: { short: 'C3', label: 'Applying', color: 'green' },
    4: { short: 'C4', label: 'Analyzing', color: 'cyan' },
    5: { short: 'C5', label: 'Evaluating', color: 'blue' },
    6: { short: 'C6', label: 'Creating', color: 'magenta' },
  };

  return (
    levels[level] || {
      short: 'No Level',
      label: 'Belum Diatur',
      color: 'default',
    }
  );
};

const QuestionsList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bankId = searchParams.get('bank_id');
  const bankName = searchParams.get('bank_name');

  const [selectedIds, setSelectedIds] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAiGenerateOpen, setIsAiGenerateOpen] = useState(false);
  const [isAiPreviewOpen, setIsAiPreviewOpen] = useState(false);
  const [activeAiJobId, setActiveAiJobId] = useState(null);
  const latestAiJobStatusRef = useRef(null);
  const [latestAiPollingInterval, setLatestAiPollingInterval] = useState(8000);

  const { data: questions = [], isLoading, refetch } = useGetQuestionsQuery({ bankid: bankId }, { skip: !bankId });
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [bulkDelete] = useBulkDeleteQuestionsMutation();
  const { data: latestAiJob, refetch: refetchLatestAiJob } = useGetAiQuestionGenerateLatestQuery(
    { bankId },
    {
      skip: !bankId,
      pollingInterval: latestAiPollingInterval,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const aiAlertMeta = getAiJobAlertMeta(latestAiJob);
  const aiProgressPercent = latestAiJob?.total_requested
    ? Math.round((Number(latestAiJob.total_generated || 0) / Number(latestAiJob.total_requested || 1)) * 100)
    : 0;

  useEffect(() => {
    if (latestAiJob?.id && !activeAiJobId) {
      setActiveAiJobId(latestAiJob.id);
    }
  }, [activeAiJobId, latestAiJob?.id]);

  useEffect(() => {
    if (!latestAiJob?.id || !latestAiJob?.status) {
      latestAiJobStatusRef.current = latestAiJob?.status || null;
      return;
    }

    const previousStatus = latestAiJobStatusRef.current;
    latestAiJobStatusRef.current = latestAiJob.status;

    if (
      previousStatus &&
      previousStatus !== latestAiJob.status &&
      ['completed', 'approved', 'discarded', 'failed'].includes(latestAiJob.status)
    ) {
      refetchLatestAiJob();
      refetch();
    }
  }, [latestAiJob, refetch, refetchLatestAiJob]);

  useEffect(() => {
    if (!bankId) {
      setLatestAiPollingInterval(0);
      return;
    }

    setLatestAiPollingInterval(latestAiJob?.status === 'queued' || latestAiJob?.status === 'running' ? 1500 : 8000);
  }, [bankId, latestAiJob?.status]);

  const totalScore = useMemo(() => questions.reduce((acc, curr) => acc + (curr.score_point || 0), 0), [questions]);

  useEffect(() => {
    if (questions.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => Math.min(prev, questions.length - 1));
  }, [questions.length]);

  const activeQuestion = questions[activeIndex] ?? null;

  const handleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const openCreateForm = () => {
    setEditingItem(null);
    setIsFormVisible(true);
  };

  const handleDeleteSingle = async (id) => {
    try {
      await deleteQuestion(id).unwrap();
      message.success('Soal berhasil dihapus');
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      refetch();
    } catch {
      message.error('Gagal menghapus soal');
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: `Hapus ${selectedIds.length} soal terpilih?`,
      icon: <AlertTriangle color="red" />,
      content: 'Tindakan ini tidak dapat dibatalkan.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          await bulkDelete(selectedIds).unwrap();
          message.success(`${selectedIds.length} soal berhasil dihapus`);
          setSelectedIds([]);
          refetch();
        } catch {
          message.error('Gagal menghapus beberapa soal');
        }
      },
    });
  };

  const handleDeleteAll = () => {
    const allIds = questions.map((q) => q.id);
    if (allIds.length === 0) return;

    Modal.confirm({
      title: 'Kosongkan semua soal?',
      icon: <AlertTriangle color="red" />,
      content: `Anda akan menghapus seluruh soal (${allIds.length} soal) dalam bank ini.`,
      okText: 'Ya, Hapus Semua',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          await bulkDelete(allIds).unwrap();
          message.success('Semua soal berhasil dihapus');
          setSelectedIds([]);
          refetch();
        } catch {
          message.error('Gagal mengosongkan soal');
        }
      },
    });
  };

  const handleDownload = async () => {
    if (!questions.length || isDownloading) return;

    setIsDownloading(true);
    try {
      await exportQuestionsToDocx({ bankName, questions });
      message.success('Dokumen Word berhasil dibuat');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      message.error('Gagal membuat dokumen Word');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderQuestionCard = (question, questionIndex) => {
    if (!question) return null;

    const typeMeta = getQuestionTypeName(question.q_type);
    const bloomMeta = getBloomLevelMeta(question.bloom_level);
    const isSelected = selectedIds.includes(question.id);
    const isFirst = questionIndex === 0;
    const isLast = questionIndex === questions.length - 1;

    return (
      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 16 : 22,
          border: isSelected ? '1px solid rgba(59, 130, 246, 0.24)' : '1px solid rgba(226, 232, 240, 0.92)',
          boxShadow: isSelected ? '0 20px 36px rgba(37, 99, 235, 0.12)' : '0 10px 24px rgba(15, 23, 42, 0.05)',
          background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.94))',
        }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}>
        <Flex vertical gap={isMobile ? 12 : 16}>
          <Flex justify="space-between" align="flex-start" gap={10}>
            <Flex align="flex-start" gap={10} flex={1} style={{ minWidth: 0 }}>
              <Checkbox
                checked={isSelected}
                onChange={() => handleSelect(question.id)}
                style={{ flexShrink: 0, marginTop: 4 }}
              />
              <Flex vertical gap={8} style={{ minWidth: 0, flex: 1 }}>
                <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : 18 }}>
                  SOAL {questionIndex + 1}
                </Title>
                <Flex align="center" gap={6} wrap="wrap">
                  <Tag
                    color={typeMeta.color}
                    style={{
                      fontSize: 10,
                      margin: 0,
                      borderRadius: 999,
                      paddingInline: 10,
                    }}>
                    {typeMeta.label}
                  </Tag>
                  <Tag
                    style={{
                      fontSize: 10,
                      margin: 0,
                      borderRadius: 999,
                      paddingInline: 10,
                      borderColor: 'rgba(37, 99, 235, 0.18)',
                      color: '#1e3a8a',
                      background: 'rgba(219, 234, 254, 0.55)',
                    }}>
                    {question.score_point} Pts
                  </Tag>
                  <Tooltip
                    title={
                      question.bloom_level
                        ? `Bloom Level ${bloomMeta.short} ${bloomMeta.label}`
                        : 'Bloom level belum diisi'
                    }>
                    <Tag
                      color={bloomMeta.color}
                      style={{
                        fontSize: 10,
                        margin: 0,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        paddingInline: 10,
                      }}>
                      <BrainCircuit size={12} />
                      {question.bloom_level
                        ? isMobile
                          ? bloomMeta.short
                          : `${bloomMeta.short} ${bloomMeta.label}`
                        : 'Tanpa Bloom'}
                    </Tag>
                  </Tooltip>
                </Flex>
              </Flex>
            </Flex>

            <Space size={4} style={{ flexShrink: 0 }}>
              <Button
                type="text"
                size={isMobile ? 'middle' : 'small'}
                icon={<Edit3 size={16} />}
                style={{ borderRadius: 10 }}
                onClick={() => {
                  setEditingItem(question);
                  setIsFormVisible(true);
                }}
              />
              <Popconfirm title="Hapus soal ini?" onConfirm={() => handleDeleteSingle(question.id)}>
                <Button
                  type="text"
                  size={isMobile ? 'middle' : 'small'}
                  danger
                  style={{ borderRadius: 10 }}
                  icon={<Trash2 size={16} />}
                />
              </Popconfirm>
            </Space>
          </Flex>

          <QuestionItem question={question} />

          <Flex
            justify="space-between"
            align="center"
            gap={12}
            style={{
              marginTop: 4,
              paddingTop: isMobile ? 12 : 16,
              borderTop: '1px solid rgba(226, 232, 240, 0.92)',
            }}>
            <Button
              icon={<ChevronLeft size={18} />}
              disabled={isFirst}
              onClick={() => setActiveIndex((prev) => prev - 1)}
              style={{ borderRadius: 10, minWidth: isMobile ? 48 : 44, minHeight: isMobile ? 44 : undefined }}
            />
            <Text strong style={{ fontSize: isMobile ? 14 : undefined }}>
              Skor: {question.score_point ?? 0}
            </Text>
            <Button
              icon={<ChevronRight size={18} />}
              disabled={isLast}
              onClick={() => setActiveIndex((prev) => prev + 1)}
              style={{ borderRadius: 10, minWidth: isMobile ? 48 : 44, minHeight: isMobile ? 44 : undefined }}
            />
          </Flex>
        </Flex>
      </Card>
    );
  };

  if (isFormVisible) {
    return (
      <Suspense
        fallback={
          <Flex justify="center" align="center" style={{ minHeight: 320 }}>
            <Spin size="large" />
          </Flex>
        }>
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
      transition={{ duration: 0.28, ease: 'easeOut' }}>
      <Flex gap="middle" vertical>
        <QuestionHeader
          bankName={bankName}
          totalCount={questions.length}
          totalScore={totalScore}
          onBack={() => navigate('/computer-based-test/bank')}
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
            icon={latestAiJob.status === 'failed' ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
            message={aiAlertMeta.title}
            description={
              <Flex justify="space-between" align="center" gap={12} wrap="wrap" style={{ marginTop: 8 }}>
                <Space direction="vertical" size={6} style={{ flex: 1 }}>
                  <Text>
                    Job #{latestAiJob.id} berstatus <strong>{latestAiJob.status}</strong>. {aiAlertMeta.description}
                  </Text>
                  {aiAlertMeta.isProcessing ? (
                    <>
                      <Text type="secondary">
                        {Number(latestAiJob.total_generated || 0)} dari {Number(latestAiJob.total_requested || 0)} draft
                        sudah tersimpan di database.
                      </Text>
                      <Progress
                        percent={Math.max(0, Math.min(aiProgressPercent, 100))}
                        status="active"
                        size="small"
                        strokeColor="#1677ff"
                      />
                    </>
                  ) : latestAiJob.total_generated ? (
                    <Text type="secondary">Total draft tersimpan: {latestAiJob.total_generated}.</Text>
                  ) : null}
                </Space>
                <Space wrap>
                  <Button
                    icon={<Eye size={14} />}
                    onClick={() => {
                      setActiveAiJobId(latestAiJob.id);
                      setIsAiPreviewOpen(true);
                    }}>
                    {aiAlertMeta.isProcessing ? 'Lihat Progress' : 'Buka Draft'}
                  </Button>
                  <Button
                    disabled={aiAlertMeta.isProcessing}
                    onClick={() => {
                      setIsAiGenerateOpen(true);
                    }}>
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
            variant="borderless"
            style={{
              borderRadius: 24,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
            }}>
            <Flex vertical justify="center" align="center" gap={14} style={{ minHeight: 320, textAlign: 'center' }}>
              <Spin size="large" />
              <Text type="secondary">Memuat daftar soal dan metadata bank pertanyaan.</Text>
            </Flex>
          </Card>
        ) : questions.length === 0 ? (
          <Card
            variant="borderless"
            style={{
              borderRadius: 24,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
            }}
            styles={{ body: { padding: isMobile ? 20 : 28 } }}>
            <Flex
              vertical
              align="center"
              justify="center"
              gap={10}
              style={{
                minHeight: 300,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(248,250,252,0.96), rgba(239,246,255,0.86))',
                borderRadius: 20,
                border: '1px dashed rgba(148, 163, 184, 0.35)',
                padding: isMobile ? 20 : 32,
              }}>
              <Empty description={false} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              <Title level={4} style={{ margin: 0 }}>
                Belum ada soal dalam bank ini
              </Title>
              <Text type="secondary" style={{ maxWidth: 520 }}>
                Tambahkan soal baru atau impor dari Excel agar bank soal siap dipakai untuk penyusunan ujian.
              </Text>
              <Button
                type="primary"
                size="large"
                onClick={openCreateForm}
                style={{
                  marginTop: 8,
                  borderRadius: 14,
                  boxShadow: '0 14px 28px rgba(37, 99, 235, 0.22)',
                }}>
                Tambah Soal Pertama
              </Button>
            </Flex>
          </Card>
        ) : (
          <Card
            variant="borderless"
            style={{
              borderRadius: isMobile ? 16 : 24,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
              background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.94))',
            }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}>
            <Flex
              justify="space-between"
              align={isMobile ? 'flex-start' : 'center'}
              gap={8}
              vertical={isMobile}
              style={{ marginBottom: isMobile ? 14 : 18, padding: isMobile ? '4px 2px' : '8px' }}>
              <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#0f172a' }}>
                Daftar Soal - {questions.length} soal
              </Text>
              <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                Soal {activeIndex + 1} dari {questions.length}
              </Text>
            </Flex>

            <Flex
              gap={isMobile ? 12 : 16}
              align="flex-start"
              vertical={isMobile}
              style={{ width: '100%' }}
              wrap={false}>
              <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {renderQuestionCard(activeQuestion, activeIndex)}
              </div>

              <QuestionNavigator questions={questions} activeIndex={activeIndex} onSelect={setActiveIndex} />
            </Flex>
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
      type: 'info',
      title: 'Draft AI',
      description: '',
      isProcessing: false,
    };
  }

  switch (job.status) {
    case 'queued':
      return {
        type: 'info',
        title: 'Generate Soal AI Masuk Antrian',
        description: 'Permintaan sudah diterima dan sedang menunggu giliran diproses.',
        isProcessing: true,
      };
    case 'running':
      return {
        type: 'info',
        title: 'Generate Soal AI Sedang Berjalan',
        description: 'AI sedang menyusun draft soal. Mohon tunggu, hasil akan muncul otomatis saat proses selesai.',
        isProcessing: true,
      };
    case 'completed':
      return {
        type: 'success',
        title: 'Draft AI Siap Direview',
        description: 'Draft soal AI sudah selesai dibuat. Silakan buka draft untuk review, edit, dan approve.',
        isProcessing: false,
      };
    case 'approved':
      return {
        type: 'success',
        title: 'Draft AI Sudah Dipakai',
        description: 'Semua draft pada job terakhir sudah di-approve ke bank soal.',
        isProcessing: false,
      };
    case 'discarded':
      return {
        type: 'warning',
        title: 'Draft AI Sudah Dibuang',
        description: 'Draft pada job terakhir sudah dibuang dan tidak akan dipakai.',
        isProcessing: false,
      };
    case 'failed':
      return {
        type: 'error',
        title: 'Generate Soal AI Gagal',
        description: job.error_message || 'Proses generate soal AI gagal. Silakan cek konfigurasi lalu coba lagi.',
        isProcessing: false,
      };
    default:
      return {
        type: 'info',
        title: 'Draft AI Terakhir',
        description: `Job #${job.id} berstatus ${job.status}.`,
        isProcessing: false,
      };
  }
};

export default QuestionsList;
