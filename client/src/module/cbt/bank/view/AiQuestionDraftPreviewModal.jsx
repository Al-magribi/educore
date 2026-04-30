import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  Progress,
  message,
} from "antd";
import {
  Check,
  CheckCircle2,
  Edit3,
  RefreshCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  useApproveAiQuestionDraftMutation,
  useApproveAiQuestionJobMutation,
  useDiscardAiQuestionDraftMutation,
  useDiscardAiQuestionJobMutation,
  useGetAiQuestionJobDetailQuery,
  useGetRubricTemplatesQuery,
  useUpdateAiQuestionDraftMutation,
} from "../../../../service/cbt/ApiQuestion";
import QuestionItem from "./QuestionItem";

const { Text, Title } = Typography;

const QUESTION_TYPES = [
  { label: "PG Jawaban Tunggal", value: 1 },
  { label: "PG Multi Jawaban", value: 2 },
  { label: "Uraian", value: 3 },
  { label: "Isian Singkat", value: 4 },
  { label: "Benar / Salah", value: 5 },
  { label: "Menjodohkan", value: 6 },
];

const BLOOM_LEVELS = [
  { value: 1, label: "C1 Remembering" },
  { value: 2, label: "C2 Understanding" },
  { value: 3, label: "C3 Applying" },
  { value: 4, label: "C4 Analyzing" },
  { value: 5, label: "C5 Evaluating" },
  { value: 6, label: "C6 Creating" },
];

const getJobStatusTag = (status) => {
  const colorMap = {
    queued: "gold",
    running: "processing",
    completed: "blue",
    failed: "red",
    approved: "green",
    discarded: "default",
    cancelled: "default",
  };
  return <Tag color={colorMap[status] || "default"}>{status || "-"}</Tag>;
};

const getDraftStatusTag = (status) => {
  const colorMap = {
    draft: "gold",
    reviewed: "blue",
    approved: "green",
    discarded: "default",
  };
  return <Tag color={colorMap[status] || "default"}>{status || "-"}</Tag>;
};

const getJobStatusMessage = (job) => {
  if (!job) return "";

  if (job.status === "queued") {
    return "Permintaan generate soal AI sudah masuk antrian dan menunggu diproses.";
  }

  if (job.status === "running") {
    return "AI sedang menyusun draft soal. Mohon tunggu, hasil akan muncul otomatis saat proses selesai.";
  }

  if (job.status === "completed") {
    return "Draft soal AI sudah selesai dibuat. Silakan review, edit, lalu approve soal yang ingin dipakai.";
  }

  if (job.status === "approved") {
    return "Semua draft pada job ini sudah di-approve ke bank soal.";
  }

  if (job.status === "discarded") {
    return "Draft pada job ini sudah dibuang dan tidak akan dipakai.";
  }

  if (job.status === "failed") {
    return (
      job.error_message ||
      "Proses generate soal AI gagal. Silakan cek konfigurasi lalu coba lagi."
    );
  }

  return "Status job AI sedang diperbarui.";
};

const mapDraftToQuestion = (draft) => ({
  ...draft,
  options: draft.options_json || [],
  rubric: draft.rubric_json || [],
});

const DraftRubricPreview = ({ rubric = [] }) => {
  if (!Array.isArray(rubric) || rubric.length < 1) return null;

  return (
    <Card
      size='small'
      style={{
        marginTop: 12,
        borderRadius: 16,
        background: "linear-gradient(135deg, #fafafa, #f8fbff)",
      }}
      title='Rubric Uraian'
    >
      <Space direction='vertical' size={10} style={{ width: "100%" }}>
        {rubric.map((item, index) => (
          <Card
            key={`${item.criteria_name}-${index}`}
            size='small'
            style={{ borderRadius: 12 }}
          >
            <Flex justify='space-between' align='flex-start' gap={12}>
              <div>
                <Text strong>{item.criteria_name || `Aspek ${index + 1}`}</Text>
                {item.criteria_description ? (
                  <Text
                    type='secondary'
                    style={{ display: "block", marginTop: 4 }}
                  >
                    {item.criteria_description}
                  </Text>
                ) : null}
              </div>
              <Tag color='blue'>{item.max_score || 0} poin</Tag>
            </Flex>
          </Card>
        ))}
      </Space>
    </Card>
  );
};

const DraftEditModal = ({ open, draft, templates, onCancel, onSaved }) => {
  const [form] = Form.useForm();
  const [updateDraft, { isLoading }] = useUpdateAiQuestionDraftMutation();
  const qType = Form.useWatch("q_type", form);

  useEffect(() => {
    if (!open || !draft) return;
    form.setFieldsValue({
      q_type: draft.q_type,
      bloom_level: draft.bloom_level,
      content: draft.content,
      score_point: draft.score_point,
      rubric_template_id: draft.rubric_template_id || undefined,
      options: draft.options_json || [],
      rubric: draft.rubric_json || [],
    });
  }, [draft, form, open]);

  const handleSubmit = async (values) => {
    try {
      await updateDraft({
        draftId: draft.id,
        ...values,
      }).unwrap();
      message.success("Draft AI berhasil diperbarui");
      onSaved?.();
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui draft AI");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={920}
      destroyOnHidden
      title='Edit Draft Soal AI'
      centered
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit}>
        <Flex gap={12} wrap='wrap'>
          <Form.Item
            name='q_type'
            label='Tipe Soal'
            rules={[{ required: true }]}
            style={{ flex: 1, minWidth: 220 }}
          >
            <Select size='large' options={QUESTION_TYPES} />
          </Form.Item>
          <Form.Item
            name='score_point'
            label='Bobot Skor'
            rules={[{ required: true }]}
            style={{ minWidth: 160 }}
          >
            <InputNumber size='large' min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name='bloom_level'
            label='Bloom Level'
            style={{ flex: 1, minWidth: 220 }}
          >
            <Select
              allowClear
              size='large'
              options={BLOOM_LEVELS}
              placeholder='Pilih Bloom level'
            />
          </Form.Item>
        </Flex>

        <Form.Item
          name='content'
          label='Konten Soal'
          rules={[{ required: true, message: "Konten soal wajib diisi" }]}
        >
          <Input.TextArea rows={6} />
        </Form.Item>

        {(qType === 1 ||
          qType === 2 ||
          qType === 4 ||
          qType === 5 ||
          qType === 6) && (
          <Form.List name='options'>
            {(fields, { add, remove }) => (
              <Card
                size='small'
                title='Opsi / Jawaban'
                style={{ borderRadius: 16 }}
              >
                <Space direction='vertical' size={12} style={{ width: "100%" }}>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Card key={key} size='small' style={{ borderRadius: 14 }}>
                      <Flex gap={12} vertical={qType === 6}>
                        {qType === 6 ? (
                          <Flex gap={12} wrap='wrap'>
                            <Form.Item
                              {...restField}
                              name={[name, "label"]}
                              label='Premis'
                              rules={[{ required: true }]}
                              style={{
                                flex: 1,
                                minWidth: 220,
                                marginBottom: 0,
                              }}
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "content"]}
                              label='Pasangan'
                              rules={[{ required: true }]}
                              style={{
                                flex: 1,
                                minWidth: 220,
                                marginBottom: 0,
                              }}
                            >
                              <Input />
                            </Form.Item>
                          </Flex>
                        ) : (
                          <Form.Item
                            {...restField}
                            name={[name, "content"]}
                            label={`Item ${index + 1}`}
                            rules={[{ required: true }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input.TextArea rows={3} />
                          </Form.Item>
                        )}

                        <Flex
                          justify='space-between'
                          align='center'
                          gap={12}
                          wrap='wrap'
                        >
                          <Form.Item
                            {...restField}
                            name={[name, "is_correct"]}
                            label='Jawaban Benar'
                            style={{ marginBottom: 0 }}
                          >
                            <Select
                              size='middle'
                              options={[
                                { value: true, label: "Benar" },
                                { value: false, label: "Salah" },
                              ]}
                            />
                          </Form.Item>
                          <Button
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() => remove(name)}
                            disabled={qType === 5 && fields.length <= 2}
                          >
                            Hapus
                          </Button>
                        </Flex>
                      </Flex>
                    </Card>
                  ))}

                  {qType !== 5 && (
                    <Button
                      type='dashed'
                      onClick={() =>
                        add(
                          qType === 6
                            ? { label: "", content: "", is_correct: true }
                            : {
                                label: null,
                                content: "",
                                is_correct: qType === 4,
                              },
                        )
                      }
                    >
                      Tambah Item
                    </Button>
                  )}
                </Space>
              </Card>
            )}
          </Form.List>
        )}

        {qType === 3 && (
          <Space direction='vertical' size={12} style={{ width: "100%" }}>
            <Form.Item
              name='rubric_template_id'
              label='Template Rubric'
              rules={[{ required: true }]}
            >
              <Select
                size='large'
                options={(templates || []).map((template) => ({
                  value: template.id,
                  label: template.name,
                }))}
              />
            </Form.Item>

            <Form.List name='rubric'>
              {(fields, { add, remove }) => (
                <Card
                  size='small'
                  title='Rubric Uraian'
                  style={{ borderRadius: 16 }}
                >
                  <Space
                    direction='vertical'
                    size={12}
                    style={{ width: "100%" }}
                  >
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size='small' style={{ borderRadius: 14 }}>
                        <Flex gap={12} vertical>
                          <Form.Item
                            {...restField}
                            name={[name, "criteria_name"]}
                            label='Nama Aspek'
                            rules={[{ required: true }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "criteria_description"]}
                            label='Deskripsi'
                            style={{ marginBottom: 0 }}
                          >
                            <Input.TextArea rows={2} />
                          </Form.Item>
                          <Flex justify='space-between' align='center'>
                            <Form.Item
                              {...restField}
                              name={[name, "max_score"]}
                              label='Poin'
                              rules={[{ required: true }]}
                              style={{ marginBottom: 0, minWidth: 160 }}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                            <Button
                              danger
                              icon={<Trash2 size={14} />}
                              onClick={() => remove(name)}
                            >
                              Hapus
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                    <Button
                      type='dashed'
                      onClick={() =>
                        add({
                          criteria_name: "",
                          criteria_description: "",
                          max_score: 0,
                        })
                      }
                    >
                      Tambah Aspek
                    </Button>
                  </Space>
                </Card>
              )}
            </Form.List>
          </Space>
        )}

        <Flex justify='flex-end' gap={10} style={{ marginTop: 18 }}>
          <Button onClick={onCancel}>Batal</Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            Simpan Draft
          </Button>
        </Flex>
      </Form>
    </Modal>
  );
};

const AiQuestionDraftPreviewModal = ({
  open,
  bankId,
  jobId,
  onClose,
  onQuestionsChanged,
  onRegenerate,
}) => {
  const [editingDraft, setEditingDraft] = useState(null);
  const { data: templates = [] } = useGetRubricTemplatesQuery(undefined, {
    skip: !open,
  });
  const { data, isFetching, refetch } = useGetAiQuestionJobDetailQuery(
    { bankId, jobId },
    {
      skip: !open || !bankId || !jobId,
      pollingInterval: open && jobId ? 4000 : 0,
    },
  );
  const [approveDraft, { isLoading: approvingDraft }] =
    useApproveAiQuestionDraftMutation();
  const [approveJob, { isLoading: approvingJob }] =
    useApproveAiQuestionJobMutation();
  const [discardDraft, { isLoading: discardingDraft }] =
    useDiscardAiQuestionDraftMutation();
  const [discardJob, { isLoading: discardingJob }] =
    useDiscardAiQuestionJobMutation();

  const drafts = data?.drafts || [];
  const summary = data?.summary || {};
  const job = data?.job;
  const isProcessing = ["queued", "running"].includes(job?.status);
  const progressPercent = job?.total_requested
    ? Math.round(
        (Number(job?.total_generated || 0) / Number(job.total_requested || 1)) *
          100,
      )
    : 0;

  const activeDrafts = useMemo(
    () =>
      drafts.filter(
        (item) => !["approved", "discarded"].includes(item.draft_status),
      ),
    [drafts],
  );

  const handleApproveDraft = async (draftId) => {
    try {
      await approveDraft({ draftId }).unwrap();
      message.success("Draft AI berhasil di-approve");
      onQuestionsChanged?.();
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal approve draft AI");
    }
  };

  const handleDiscardDraft = async (draftId) => {
    try {
      await discardDraft({ draftId }).unwrap();
      message.success("Draft AI berhasil dibuang");
      onQuestionsChanged?.();
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal membuang draft AI");
    }
  };

  const handleApproveAll = async () => {
    try {
      await approveJob({ jobId }).unwrap();
      message.success("Semua draft AI berhasil di-approve");
      onQuestionsChanged?.();
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal approve semua draft AI");
    }
  };

  const handleDiscardAll = async () => {
    try {
      await discardJob({ jobId }).unwrap();
      message.success("Semua draft AI berhasil dibuang");
      onQuestionsChanged?.();
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal membuang draft AI");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={1100}
        footer={null}
        destroyOnHidden
        title={
          <Flex align='center' gap={10}>
            <Sparkles size={18} />
            <span>Preview Draft Soal AI</span>
          </Flex>
        }
        centered
      >
        {isFetching && !data ? (
          <Flex
            vertical
            justify='center'
            align='center'
            gap={12}
            style={{ minHeight: 320 }}
          >
            <Spin size='large' />
            <Text type='secondary'>Memuat draft soal hasil AI.</Text>
          </Flex>
        ) : !job ? (
          <Empty description='Draft AI belum tersedia' />
        ) : (
          <Space direction='vertical' size={16} style={{ width: "100%" }}>
            <Card style={{ borderRadius: 18 }}>
              <Flex
                justify='space-between'
                align='flex-start'
                gap={16}
                wrap='wrap'
              >
                <div>
                  <Title level={5} style={{ margin: 0 }}>
                    Job #{job.id}
                  </Title>
                  <Text type='secondary'>
                    Status generate soal AI untuk bank ini.
                  </Text>
                </div>
                <Space wrap>
                  {getJobStatusTag(job.status)}
                  <Button disabled={isProcessing} onClick={onRegenerate}>
                    Generate Ulang
                  </Button>
                  <Button icon={<RefreshCcw size={14} />} onClick={refetch}>
                    Refresh
                  </Button>
                </Space>
              </Flex>

              {isProcessing ? (
                <Alert
                  type='info'
                  showIcon
                  style={{ marginTop: 14 }}
                  message={
                    job.status === "queued"
                      ? "Generate AI sedang menunggu antrian"
                      : "Generate AI sedang berlangsung"
                  }
                  description={
                    <Space
                      direction='vertical'
                      size={10}
                      style={{ width: "100%" }}
                    >
                      <Text>{getJobStatusMessage(job)}</Text>
                      <Progress
                        percent={Math.max(0, Math.min(progressPercent, 100))}
                        status='active'
                        strokeColor='#1677ff'
                      />
                    </Space>
                  }
                />
              ) : job.status === "failed" ? (
                <Alert
                  type='error'
                  showIcon
                  style={{ marginTop: 14 }}
                  message='Generate AI gagal'
                  description={getJobStatusMessage(job)}
                />
              ) : (
                <Alert
                  type={
                    job.status === "completed" || job.status === "approved"
                      ? "success"
                      : "info"
                  }
                  showIcon
                  style={{ marginTop: 14 }}
                  message='Status Generate AI'
                  description={getJobStatusMessage(job)}
                />
              )}

              <Flex gap={12} wrap='wrap' style={{ marginTop: 16 }}>
                <Card size='small' style={{ borderRadius: 16, minWidth: 140 }}>
                  <Statistic title='Draft' value={summary.total_drafts || 0} />
                </Card>
                <Card size='small' style={{ borderRadius: 16, minWidth: 140 }}>
                  <Statistic
                    title='Total Poin'
                    value={summary.total_score || 0}
                    suffix='/100'
                  />
                </Card>
                <Card size='small' style={{ borderRadius: 16, minWidth: 140 }}>
                  <Statistic
                    title='Approved'
                    value={summary.approved_count || 0}
                  />
                </Card>
                <Card size='small' style={{ borderRadius: 16, minWidth: 140 }}>
                  <Statistic
                    title='Discarded'
                    value={summary.discarded_count || 0}
                  />
                </Card>
              </Flex>

              <Descriptions
                column={1}
                size='small'
                style={{ marginTop: 14 }}
                items={[
                  {
                    key: "model",
                    label: "Model",
                    children: job.model || "-",
                  },
                  {
                    key: "requested",
                    label: "Jumlah Diminta",
                    children: job.total_requested || 0,
                  },
                  {
                    key: "generated",
                    label: "Jumlah Generated",
                    children: job.total_generated || 0,
                  },
                ]}
              />

              <Flex
                justify='flex-end'
                gap={10}
                wrap='wrap'
                style={{ marginTop: 12 }}
              >
                <Button
                  type='primary'
                  icon={<Check size={16} />}
                  disabled={activeDrafts.length < 1 || isProcessing}
                  loading={approvingJob}
                  onClick={handleApproveAll}
                >
                  Approve Semua Draft Aktif
                </Button>
                <Button
                  danger
                  icon={<Trash2 size={16} />}
                  disabled={activeDrafts.length < 1 || isProcessing}
                  loading={discardingJob}
                  onClick={handleDiscardAll}
                >
                  Buang Semua Draft Aktif
                </Button>
              </Flex>
            </Card>

            {drafts.length < 1 ? (
              <Empty description='Belum ada draft soal di job ini' />
            ) : (
              drafts.map((draft, index) => (
                <Card key={draft.id} style={{ borderRadius: 18 }}>
                  <Flex
                    justify='space-between'
                    align='flex-start'
                    gap={12}
                    wrap='wrap'
                  >
                    <div>
                      <Flex align='center' gap={8} wrap='wrap'>
                        <Text strong>Draft {index + 1}</Text>
                        {getDraftStatusTag(draft.draft_status)}
                        {draft.is_edited ? (
                          <Tag color='cyan'>Edited</Tag>
                        ) : null}
                        {draft.approved_question_id ? (
                          <Tag color='green'>
                            Question #{draft.approved_question_id}
                          </Tag>
                        ) : null}
                      </Flex>
                      <Text type='secondary'>
                        Tipe {draft.q_type} - Bobot {draft.score_point}
                      </Text>
                    </div>

                    <Space wrap>
                      <Button
                        icon={<Edit3 size={14} />}
                        disabled={["approved", "discarded"].includes(
                          draft.draft_status,
                        )}
                        onClick={() => setEditingDraft(draft)}
                      >
                        Edit
                      </Button>
                      <Button
                        type='primary'
                        icon={<CheckCircle2 size={14} />}
                        disabled={
                          draft.draft_status !== "draft" &&
                          draft.draft_status !== "reviewed"
                        }
                        loading={approvingDraft}
                        onClick={() => handleApproveDraft(draft.id)}
                      >
                        Approve
                      </Button>
                      <Popconfirm
                        title='Buang draft ini?'
                        onConfirm={() => handleDiscardDraft(draft.id)}
                        disabled={["approved", "discarded"].includes(
                          draft.draft_status,
                        )}
                      >
                        <Button
                          danger
                          icon={<Trash2 size={14} />}
                          disabled={["approved", "discarded"].includes(
                            draft.draft_status,
                          )}
                          loading={discardingDraft}
                        >
                          Buang
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Flex>

                  <div style={{ marginTop: 16 }}>
                    <QuestionItem question={mapDraftToQuestion(draft)} />
                    {Number(draft.q_type) === 3 ? (
                      <DraftRubricPreview rubric={draft.rubric_json} />
                    ) : null}
                  </div>
                </Card>
              ))
            )}
          </Space>
        )}
      </Modal>

      <DraftEditModal
        open={Boolean(editingDraft)}
        draft={editingDraft}
        templates={templates}
        onCancel={() => setEditingDraft(null)}
        onSaved={() => {
          setEditingDraft(null);
          refetch();
        }}
      />
    </>
  );
};

export default AiQuestionDraftPreviewModal;
