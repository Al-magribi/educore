import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Form,
  Select,
  Button,
  Card,
  InputNumber,
  Input,
  Space,
  message,
  Alert,
  Flex,
  Grid,
  Typography,
  Tag,
} from "antd";
import {
  Save,
  ListChecks,
  Type,
  CheckSquare,
  AlignLeft,
  GitMerge,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  X,
  Sigma,
  BrainCircuit,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useCreateQuestionMutation,
  useGetRubricTemplatesQuery,
  useUpdateQuestionMutation,
} from "../../../../../service/cbt/ApiQuestion";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

import OptionSingleMulti from "./OptionSingleMulti";
import OptionTrueFalse from "./OptionTrueFalse";
import OptionMatching from "./OptionMatching";
import OptionShortAnswer from "./OptionShortAnswer";
import TextEditor from "./TextEditor";

const QUESTION_TYPES = [
  { label: "PG Jawaban Tunggal", value: 1, icon: <CheckCircle2 size={16} /> },
  { label: "PG Multi Jawaban", value: 2, icon: <CheckSquare size={16} /> },
  { label: "Uraian", value: 3, icon: <AlignLeft size={16} /> },
  { label: "Isian Singkat", value: 4, icon: <Type size={16} /> },
  { label: "Benar / Salah", value: 5, icon: <ListChecks size={16} /> },
  { label: "Menjodohkan", value: 6, icon: <GitMerge size={16} /> },
];

const BLOOM_LEVELS = [
  { value: 1, short: "C1", label: "Remembering" },
  { value: 2, short: "C2", label: "Understanding" },
  { value: 3, short: "C3", label: "Applying" },
  { value: 4, short: "C4", label: "Analyzing" },
  { value: 5, short: "C5", label: "Evaluating" },
  { value: 6, short: "C6", label: "Creating" },
];

const DEFAULT_RUBRIC_TEMPLATE_CODE = "general_essay";

const createRubricItemsFromTemplate = (template) =>
  (template?.items || []).map((item, index) => ({
    template_id: template.id,
    criteria_name: item.criteria_name || "",
    criteria_description: item.criteria_description || "",
    max_score: Number(item.default_weight) || 0,
    order_no: item.order_no || index + 1,
  }));

const normalizeExistingRubric = (rubric = [], templateId = null) =>
  (Array.isArray(rubric) ? rubric : []).map((item, index) => ({
    template_id: item.template_id ?? templateId ?? null,
    criteria_name: item.criteria_name || "",
    criteria_description: item.criteria_description || "",
    max_score: Number(item.max_score) || 0,
    order_no: index + 1,
  }));

const QuestionForm = ({ initialData, bankId, onSaveSuccess, onCancel }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [form] = Form.useForm();
  const [qType, setQType] = useState(1);
  const watchedScorePoint = Form.useWatch("score_point", form);
  const watchedRubric = Form.useWatch("rubric", form) || [];
  const [createQuestion, { isLoading: isCreating }] =
    useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] =
    useUpdateQuestionMutation();
  const { data: rubricTemplates = [], isFetching: rubricTemplatesLoading } =
    useGetRubricTemplatesQuery();

  const isLoading = isCreating || isUpdating;
  const rubricTotal = watchedRubric.reduce(
    (sum, item) => sum + (Number(item?.max_score) || 0),
    0,
  );

  const resetToDefault = useCallback(
    (type, templates = rubricTemplates) => {
      let defaultOptions = [];
      let defaultRubricTemplateId = null;
      let defaultRubric = [];
      if (type === 1 || type === 2) {
        defaultOptions = [
          { content: "", is_correct: true },
          { content: "", is_correct: false },
          { content: "", is_correct: false },
          { content: "", is_correct: false },
        ];
      } else if (type === 5) {
        defaultOptions = [
          { content: "Benar", is_correct: true },
          { content: "Salah", is_correct: false },
        ];
      } else if (type === 6) {
        defaultOptions = [{ label: "", content: "", is_correct: true }];
      } else if (type === 4) {
        defaultOptions = [{ content: "", is_correct: true }];
      } else if (type === 3) {
        const defaultTemplate =
          templates.find((item) => item.code === DEFAULT_RUBRIC_TEMPLATE_CODE) ||
          templates[0];
        if (defaultTemplate) {
          defaultRubricTemplateId = defaultTemplate.id;
          defaultRubric = createRubricItemsFromTemplate(defaultTemplate);
        }
      }

      form.setFieldsValue({
        q_type: type,
        content: "",
        options: defaultOptions,
        rubric_template_id: defaultRubricTemplateId,
        rubric: defaultRubric,
        score_point: 1,
        bloom_level: null,
      });
      setQType(type);
    },
    [form, rubricTemplates],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        rubric_template_id: initialData.rubric_template_id || null,
        rubric: normalizeExistingRubric(
          initialData.rubric,
          initialData.rubric_template_id,
        ),
      });
      setQType(initialData.q_type);
      return;
    }

    if (rubricTemplates.length > 0) {
      resetToDefault(1, rubricTemplates);
    }
  }, [initialData, form, resetToDefault, rubricTemplates]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleTypeChange = (val) => {
    resetToDefault(val);
  };

  const handleRubricTemplateChange = (templateId) => {
    const selectedTemplate = rubricTemplates.find(
      (item) => item.id === templateId,
    );
    form.setFieldsValue({
      rubric_template_id: templateId,
      rubric: createRubricItemsFromTemplate(selectedTemplate),
    });
  };

  const onFinish = async (values) => {
    try {
      if (values.q_type === 3) {
        const rubric = normalizeExistingRubric(
          values.rubric,
          values.rubric_template_id,
        );
        const totalRubricPoints = rubric.reduce(
          (sum, item) => sum + (Number(item.max_score) || 0),
          0,
        );

        if (rubric.length === 0) {
          message.error("Tambahkan minimal 1 aspek rubric untuk soal uraian");
          return;
        }

        if (Number(totalRubricPoints) !== Number(values.score_point || 0)) {
          message.error(
            "Total poin rubric harus sama dengan bobot skor soal uraian",
          );
          return;
        }
      }

      const payload = {
        ...values,
        bank_id: bankId,
        rubric:
          values.q_type === 3
            ? normalizeExistingRubric(values.rubric, values.rubric_template_id)
            : [],
      };

      if (initialData?.id) {
        await updateQuestion({ id: initialData.id, ...payload }).unwrap();
        message.success("Soal berhasil diperbarui");
      } else {
        await createQuestion(payload).unwrap();
        message.success("Soal berhasil ditambahkan");
      }
      onSaveSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan soal");
    }
  };

  const renderOptions = () => {
    switch (qType) {
      case 1:
        return <OptionSingleMulti form={form} isMulti={false} />;
      case 2:
        return <OptionSingleMulti form={form} isMulti={true} />;
      case 3:
        return (
          <Space direction='vertical' size={16} style={{ width: "100%" }}>
            <Alert
              message='Tipe Soal Uraian'
              description='Pilih template rubric yang paling dekat dengan karakter soal, lalu bagi poinnya per aspek. Total poin rubric harus sama dengan bobot skor soal.'
              type='info'
              showIcon
              style={{ borderRadius: 16 }}
            />

            <Form.Item
              name='rubric_template_id'
              label='Template Rubric'
              rules={[
                { required: true, message: "Pilih template rubric uraian" },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size='large'
                placeholder='Pilih template rubric'
                loading={rubricTemplatesLoading}
                onChange={handleRubricTemplateChange}
                options={rubricTemplates.map((template) => ({
                  value: template.id,
                  label: template.name,
                }))}
              />
            </Form.Item>

            <Form.List name='rubric'>
              {(fields, { add, remove }) => (
                <Space direction='vertical' size={12} style={{ width: "100%" }}>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Card
                      key={key}
                      size='small'
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        background: "#f8fafc",
                      }}
                      styles={{ body: { padding: 14 } }}
                    >
                      <Flex
                        justify='space-between'
                        align='flex-start'
                        gap={12}
                        style={{
                          flexDirection: isMobile ? "column" : "row",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Form.Item
                            {...restField}
                            name={[name, "criteria_name"]}
                            label={`Aspek ${index + 1}`}
                            rules={[
                              {
                                required: true,
                                message: "Nama aspek rubric wajib diisi",
                              },
                            ]}
                          >
                            <Input
                              size='large'
                              placeholder='Nama aspek penilaian'
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, "criteria_description"]}
                            label='Deskripsi Aspek'
                            style={{ marginBottom: 0 }}
                          >
                            <TextEditor
                              variant='short'
                              placeholder='Penjelasan singkat aspek penilaian'
                              height='140px'
                            />
                          </Form.Item>
                        </div>

                        <Space
                          direction='vertical'
                          size={10}
                          style={{ width: isMobile ? "100%" : 140 }}
                        >
                          <Form.Item
                            {...restField}
                            name={[name, "max_score"]}
                            label='Poin'
                            rules={[
                              {
                                required: true,
                                message: "Isi poin aspek",
                              },
                            ]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber
                              min={0}
                              style={{ width: "100%" }}
                              size='large'
                            />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, "order_no"]}
                            initialValue={index + 1}
                            hidden
                          >
                            <InputNumber />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, "template_id"]}
                            hidden
                          >
                            <InputNumber />
                          </Form.Item>

                          <Button
                            danger
                            icon={<Trash2 size={16} />}
                            onClick={() => remove(name)}
                            disabled={fields.length <= 1}
                            block={isMobile}
                          >
                            Hapus
                          </Button>
                        </Space>
                      </Flex>
                    </Card>
                  ))}

                  <Button
                    type='dashed'
                    icon={<Plus size={16} />}
                    onClick={() =>
                      add({
                        criteria_name: "",
                        criteria_description: "",
                        max_score: 0,
                        order_no: fields.length + 1,
                        template_id: form.getFieldValue("rubric_template_id"),
                      })
                    }
                    style={{ borderRadius: 14, height: 42 }}
                  >
                    Tambah Aspek Rubric
                  </Button>

                  <Flex
                    justify='space-between'
                    align={isMobile ? "flex-start" : "center"}
                    gap={10}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
                      border: "1px solid rgba(59, 130, 246, 0.14)",
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    <div>
                      <Text strong style={{ display: "block" }}>
                        Total Poin Rubric
                      </Text>
                      <Text type='secondary'>
                        Samakan total poin semua aspek dengan bobot skor soal.
                      </Text>
                    </div>
                    <Space size={8} wrap>
                      <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
                        Bobot Soal: {Number(watchedScorePoint || 0)}
                      </Tag>
                      <Tag
                        color={
                          Number(rubricTotal) === Number(watchedScorePoint || 0)
                            ? "green"
                            : "red"
                        }
                        style={{ margin: 0, borderRadius: 999 }}
                      >
                        Total Rubric: {rubricTotal}
                      </Tag>
                    </Space>
                  </Flex>
                </Space>
              )}
            </Form.List>
          </Space>
        );
      case 4:
        return <OptionShortAnswer />;
      case 5:
        return <OptionTrueFalse form={form} />;
      case 6:
        return <OptionMatching />;
      default:
        return null;
    }
  };

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 24,
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
      }}
      styles={{ body: { padding: 0 } }}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={onFinish}
        initialValues={{ q_type: 1, score_point: 1 }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(239,246,255,1), rgba(236,253,245,0.96))",
            padding: isMobile ? 20 : 28,
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <Flex align='flex-start' gap={16}>
            <div
              style={{
                width: isMobile ? 48 : 56,
                height: isMobile ? 48 : 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #14b8a6)",
                color: "#fff",
                boxShadow: "0 16px 30px rgba(37, 99, 235, 0.28)",
                flexShrink: 0,
              }}
            >
              <ClipboardList size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <Flex
                justify='space-between'
                align={isMobile ? "flex-start" : "center"}
                vertical={isMobile}
                gap={10}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {initialData ? "Perbarui Soal" : "Buat Soal Baru"}
                  </Title>
                  <Text
                    type='secondary'
                    style={{ display: "block", marginTop: 6 }}
                  >
                    Susun konten soal, tipe jawaban, bobot nilai, dan level
                    kognitif dalam satu form yang lebih terstruktur untuk
                    workflow produksi CBT.
                  </Text>
                </div>

                <Tag
                  bordered={false}
                  style={{
                    marginInlineEnd: 0,
                    borderRadius: 999,
                    padding: "6px 12px",
                    background: "rgba(37, 99, 235, 0.10)",
                    color: "#1d4ed8",
                    fontWeight: 600,
                  }}
                >
                  {initialData ? "Mode Edit" : "Draft Baru"}
                </Tag>
              </Flex>
            </div>
          </Flex>
        </div>

        <div style={{ padding: isMobile ? 20 : 28 }}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "#fff",
              }}
              styles={{ body: { padding: isMobile ? 16 : 18 } }}
            >
              <Flex
                justify='space-between'
                align={screens.sm ? "center" : "stretch"}
                gap={16}
                wrap
              >
                <Form.Item
                  name='q_type'
                  label='Tipe Soal'
                  rules={[{ required: true }]}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "100%" : 260,
                    marginBottom: 0,
                  }}
                >
                  <Select
                    onChange={handleTypeChange}
                    size='large'
                    virtual={false}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <Select.Option key={t.value} value={t.value}>
                        <Space>
                          {t.icon}
                          {t.label}
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name='score_point'
                  label='Bobot Skor'
                  rules={[{ required: true }]}
                  style={{ minWidth: isMobile ? "100%" : 180, marginBottom: 0 }}
                >
                  <InputNumber
                    min={1}
                    style={{ width: "100%" }}
                    size='large'
                    prefix={<Sigma size={14} />}
                  />
                </Form.Item>

                <Form.Item
                  name='bloom_level'
                  label='Bloom Level'
                  style={{ minWidth: isMobile ? "100%" : 220, marginBottom: 0 }}
                >
                  <Select
                    allowClear
                    size='large'
                    placeholder='Pemetaan Level Bloom'
                    suffixIcon={<BrainCircuit size={16} />}
                  >
                    {BLOOM_LEVELS.map((level) => (
                      <Select.Option
                        key={level.value}
                        value={level.value}
                        label={`${level.short} ${level.label}`}
                      >
                        <Space size={10}>
                          <Tag
                            color='gold'
                            bordered={false}
                            style={{ margin: 0, borderRadius: 999 }}
                          >
                            {level.short}
                          </Tag>
                          <span>{level.label}</span>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Flex>
            </Card>

            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "#fff",
              }}
              styles={{ body: { padding: isMobile ? 16 : 18 } }}
            >
              <Form.Item
                name='content'
                label={
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Pertanyaan
                  </span>
                }
                rules={[{ required: true, message: "Tulis pertanyaan soal" }]}
                style={{ marginBottom: 0 }}
              >
                <TextEditor
                  placeholder='Tulis soal di sini. Gunakan toolbar untuk menyisipkan gambar, rumus, atau format teks yang dibutuhkan.'
                  height='300px'
                />
              </Form.Item>
            </Card>

            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)",
              }}
              styles={{ body: { padding: isMobile ? 16 : 18 } }}
            >
              <Flex align='center' gap={10} style={{ marginBottom: 14 }}>
                <Sparkles size={18} color='#1d4ed8' />
                <Title level={5} style={{ margin: 0 }}>
                  {qType === 3 ? "Rubric Penilaian Uraian" : "Kunci Jawaban & Opsi"}
                </Title>
              </Flex>
              {renderOptions()}
            </Card>

            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
                border: "1px solid rgba(14, 165, 233, 0.16)",
              }}
            >
              <Flex align='flex-start' gap={12}>
                <CheckCircle2
                  size={18}
                  color='#0284c7'
                  style={{ marginTop: 2 }}
                />
                <div>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Catatan penyusunan
                  </Text>
                  <Text type='secondary'>
                    Pastikan tipe soal, opsi jawaban, bobot penilaian, dan level
                    Bloom sudah sesuai sebelum menyimpan agar data siap dipakai
                    pada sesi ujian dan analitik.
                  </Text>
                </div>
              </Flex>
            </Card>

            <Flex
              justify='flex-end'
              gap={12}
              style={{ flexDirection: isMobile ? "column-reverse" : "row" }}
            >
              <Button
                onClick={onCancel}
                disabled={isLoading}
                size='large'
                icon={<X size={16} />}
                style={{
                  borderRadius: 14,
                  minWidth: isMobile ? "100%" : 120,
                }}
              >
                Batal
              </Button>
              <Button
                type='primary'
                htmlType='submit'
                icon={<Save size={18} />}
                loading={isLoading}
                size='large'
                style={{
                  borderRadius: 14,
                  minWidth: isMobile ? "100%" : 180,
                  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
                }}
              >
                {initialData ? "Perbarui Soal" : "Simpan Soal"}
              </Button>
            </Flex>
          </MotionDiv>
        </div>
      </Form>
    </Card>
  );
};

export default QuestionForm;
