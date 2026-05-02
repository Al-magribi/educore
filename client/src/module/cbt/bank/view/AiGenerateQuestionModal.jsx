import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { BrainCircuit, Layers3, Sparkles, Wand2 } from "lucide-react";
import {
  useGetAiQuestionGenerateMetaQuery,
  useStartAiQuestionGenerateMutation,
} from "../../../../service/cbt/ApiQuestion";

const { Text, Title } = Typography;

const BLOOM_LEVEL_OPTIONS = [
  { value: 1, label: "C1 Remembering" },
  { value: 2, label: "C2 Understanding" },
  { value: 3, label: "C3 Applying" },
  { value: 4, label: "C4 Analyzing" },
  { value: 5, label: "C5 Evaluating" },
  { value: 6, label: "C6 Creating" },
];

const COUNT_FIELDS = [
  { key: "single", label: "PG Tunggal" },
  { key: "multi", label: "PG Multi" },
  { key: "match", label: "Menjodohkan" },
  { key: "true_false", label: "Benar / Salah" },
  { key: "short", label: "Isian Singkat" },
  { key: "essay", label: "Essay" },
];

const initialValues = {
  chapter_ids: [],
  material_summary: "",
  bloom_levels: [2, 3],
  question_counts: {
    single: 0,
    multi: 0,
    match: 0,
    true_false: 0,
    short: 0,
    essay: 0,
  },
};

const AiGenerateQuestionModal = ({ open, bankId, onCancel, onStarted }) => {
  const [form] = Form.useForm();
  const selectedGradeId = Form.useWatch("grade_id", form);
  const {
    data: meta,
    isFetching,
    refetch,
  } = useGetAiQuestionGenerateMetaQuery(
    { bankId, gradeId: selectedGradeId },
    {
      skip: !open || !bankId,
    },
  );
  const [startGenerate, { isLoading: isStarting }] =
    useStartAiQuestionGenerateMutation();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(initialValues);
  }, [form, open]);

  useEffect(() => {
    if (!open || !meta?.grades?.length) return;
    const currentGrade = form.getFieldValue("grade_id");
    if (!currentGrade) {
      form.setFieldValue("grade_id", meta.grades[0]?.id);
    }
  }, [form, meta, open]);

  useEffect(() => {
    if (!open) return;
    form.setFieldValue("chapter_ids", []);
  }, [form, open, selectedGradeId]);

  const handleSubmit = async (values) => {
    try {
      const response = await startGenerate({
        bankId,
        ...values,
      }).unwrap();
      message.success(response?.message || "Generate soal AI dimulai");
      onStarted?.(response?.data?.id || response?.data?.job_id || null);
    } catch (error) {
      message.error(error?.data?.message || "Gagal memulai generate soal AI");
    }
  };

  const aiConfig = meta?.ai_config;
  const isReady = Boolean(aiConfig?.is_ready);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={880}
      destroyOnClose
      title={
        <Flex align='center' gap={10}>
          <Wand2 size={18} />
          <span>Generate Soal dengan AI</span>
        </Flex>
      }
      centered
    >
      {isFetching ? (
        <Flex
          vertical
          justify='center'
          align='center'
          gap={12}
          style={{ minHeight: 260 }}
        >
          <Spin size='large' />
          <Text type='secondary'>Menyiapkan konteks generate soal AI.</Text>
        </Flex>
      ) : (
        <Form
          form={form}
          layout='vertical'
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Space direction='vertical' size={18} style={{ width: "100%" }}>
            <Card
              size='small'
              style={{
                borderRadius: 18,
                background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
                border: "1px solid rgba(59, 130, 246, 0.12)",
              }}
            >
              <Flex
                justify='space-between'
                align='flex-start'
                gap={12}
                wrap='wrap'
              >
                <div>
                  <Text type='secondary'>Bank Soal</Text>
                  <Title level={5} style={{ margin: "4px 0 0 0" }}>
                    {meta?.bank?.title || "-"}
                  </Title>
                  <Text type='secondary'>
                    {meta?.bank?.subject_name || "-"}{" "}
                    {meta?.bank?.subject_code
                      ? `(${meta.bank.subject_code})`
                      : ""}
                  </Text>
                </div>
                <Flex gap={8} wrap='wrap'>
                  <Tag color={isReady ? "green" : "red"}>
                    {isReady ? "AI Siap" : "AI Belum Siap"}
                  </Tag>
                  {aiConfig?.default_model_text ? (
                    <Tag color='blue'>{aiConfig.default_model_text}</Tag>
                  ) : null}
                </Flex>
              </Flex>
            </Card>

            {!isReady && (
              <Alert
                type='warning'
                showIcon
                message='Konfigurasi AI guru belum siap'
                description='Pastikan API key OpenAI tersedia, konfigurasi aktif, dan fitur question generator dinyalakan.'
              />
            )}

            <Flex gap={16} wrap='wrap'>
              <Form.Item
                name='grade_id'
                label='Tingkat'
                rules={[{ required: true, message: "Pilih tingkat" }]}
                style={{ flex: 1, minWidth: 220, marginBottom: 0 }}
              >
                <Select
                  size='large'
                  placeholder='Pilih tingkat'
                  options={(meta?.grades || []).map((grade) => ({
                    value: grade.id,
                    label: grade.name,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name='bloom_levels'
                label='Bloom Level'
                rules={[
                  { required: true, message: "Pilih minimal 1 level Bloom" },
                ]}
                style={{ flex: 1, minWidth: 240, marginBottom: 0 }}
              >
                <Select
                  mode='multiple'
                  size='large'
                  placeholder='Pilih level Bloom'
                  suffixIcon={<BrainCircuit size={16} />}
                  options={BLOOM_LEVEL_OPTIONS}
                />
              </Form.Item>
            </Flex>

            <Form.Item
              name='chapter_ids'
              label='Materi dari Mapel'
              extra='Pilih materi/chapter yang relevan. Jika belum ada chapter, isi ringkasan materi tambahan.'
            >
              <Select
                mode='multiple'
                size='large'
                placeholder={
                  selectedGradeId
                    ? "Pilih materi"
                    : "Pilih tingkat terlebih dahulu"
                }
                suffixIcon={<Layers3 size={16} />}
                disabled={!selectedGradeId}
                options={(meta?.chapters || []).map((chapter) => ({
                  value: chapter.id,
                  label: chapter.title,
                }))}
              />
            </Form.Item>

            <Form.Item
              name='material_summary'
              label='Ringkasan Materi Tambahan'
            >
              <Input.TextArea
                rows={4}
                placeholder='Tambahkan fokus materi, cakupan bab, atau arahan khusus untuk AI jika diperlukan.'
              />
            </Form.Item>

            <Card
              size='small'
              style={{ borderRadius: 18 }}
              title={
                <Flex align='center' gap={8}>
                  <Sparkles size={16} />
                  <span>Jumlah Soal per Tipe</span>
                </Flex>
              }
            >
              <Flex gap={12} wrap='wrap'>
                {COUNT_FIELDS.map((field) => (
                  <Form.Item
                    key={field.key}
                    name={["question_counts", field.key]}
                    label={field.label}
                    style={{ minWidth: 160, flex: 1, marginBottom: 12 }}
                  >
                    <InputNumber
                      min={0}
                      max={20}
                      size='large'
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                ))}
              </Flex>
            </Card>

            <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
              <Button onClick={refetch}>Refresh Meta</Button>
              <Space>
                <Button onClick={onCancel}>Batal</Button>
                <Button
                  type='primary'
                  htmlType='submit'
                  loading={isStarting}
                  disabled={!isReady}
                >
                  Mulai Generate
                </Button>
              </Space>
            </Flex>
          </Space>
        </Form>
      )}
    </Modal>
  );
};

export default AiGenerateQuestionModal;
