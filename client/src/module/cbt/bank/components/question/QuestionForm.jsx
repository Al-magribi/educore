import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Form,
  Select,
  Button,
  Card,
  InputNumber,
  Space,
  Divider,
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
} from "lucide-react";
import {
  useCreateQuestionMutation,
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

const QuestionForm = ({ initialData, bankSoalId, onSaveSuccess, onCancel }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [form] = Form.useForm();
  const [qType, setQType] = useState(1);
  const [createQuestion, { isLoading: isCreating }] =
    useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] =
    useUpdateQuestionMutation();

  const isLoading = isCreating || isUpdating;

  const resetToDefault = useCallback((type) => {
    let defaultOptions = [];
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
    }

    form.setFieldsValue({
      q_type: type,
      content: "",
      options: defaultOptions,
      score_point: 1,
    });
    setQType(type);
  }, [form]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
      setQType(initialData.q_type);
    } else {
      resetToDefault(1);
    }
  }, [initialData, form, resetToDefault]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleTypeChange = (val) => {
    resetToDefault(val);
  };

  const onFinish = async (values) => {
    try {
      const payload = {
        ...values,
        bank_soal_id: bankSoalId,
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
          <Alert
            message="Tipe Soal Uraian"
            description="Untuk tipe soal uraian, sistem tidak menetapkan kunci jawaban otomatis. Pemeriksaan dilakukan secara manual oleh guru atau penilai."
            type="warning"
            showIcon
            style={{ borderRadius: 16 }}
          />
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
        layout="vertical"
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
          <Flex align="flex-start" gap={16}>
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
                justify="space-between"
                align={isMobile ? "flex-start" : "center"}
                vertical={isMobile}
                gap={10}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {initialData ? "Perbarui Soal" : "Buat Soal Baru"}
                  </Title>
                  <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                    Susun konten soal, tipe jawaban, dan bobot nilai dalam satu form yang lebih terstruktur untuk workflow produksi CBT.
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
                justify="space-between"
                align={screens.sm ? "center" : "stretch"}
                gap={16}
                wrap
              >
                <Form.Item
                  name="q_type"
                  label="Tipe Soal"
                  rules={[{ required: true }]}
                  style={{ flex: 1, minWidth: isMobile ? "100%" : 260, marginBottom: 0 }}
                >
                  <Select onChange={handleTypeChange} size="large" virtual={false}>
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
                  name="score_point"
                  label="Bobot Skor"
                  rules={[{ required: true }]}
                  style={{ minWidth: isMobile ? "100%" : 180, marginBottom: 0 }}
                >
                  <InputNumber
                    min={1}
                    style={{ width: "100%" }}
                    size="large"
                    prefix={<Sigma size={14} />}
                  />
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
                name="content"
                label={<span style={{ fontSize: 16, fontWeight: 600 }}>Pertanyaan</span>}
                rules={[{ required: true, message: "Tulis pertanyaan soal" }]}
                style={{ marginBottom: 0 }}
              >
                <TextEditor
                  placeholder="Tulis soal di sini. Gunakan toolbar untuk menyisipkan gambar, rumus, atau format teks yang dibutuhkan."
                  height="300px"
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
              <Flex align="center" gap={10} style={{ marginBottom: 14 }}>
                <Sparkles size={18} color="#1d4ed8" />
                <Title level={5} style={{ margin: 0 }}>
                  Kunci Jawaban & Opsi
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
              <Flex align="flex-start" gap={12}>
                <CheckCircle2 size={18} color="#0284c7" style={{ marginTop: 2 }} />
                <div>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Catatan penyusunan
                  </Text>
                  <Text type="secondary">
                    Pastikan tipe soal, opsi jawaban, dan bobot penilaian sudah sesuai sebelum menyimpan agar data siap dipakai pada sesi ujian.
                  </Text>
                </div>
              </Flex>
            </Card>

            <Flex
              justify="flex-end"
              gap={12}
              style={{ flexDirection: isMobile ? "column-reverse" : "row" }}
            >
              <Button
                onClick={onCancel}
                disabled={isLoading}
                size="large"
                icon={<X size={16} />}
                style={{
                  borderRadius: 14,
                  minWidth: isMobile ? "100%" : 120,
                }}
              >
                Batal
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<Save size={18} />}
                loading={isLoading}
                size="large"
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
