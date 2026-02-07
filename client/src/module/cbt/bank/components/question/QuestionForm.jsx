import React, { useEffect, useState } from "react";
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
} from "antd";
import {
  Save,
  ListChecks,
  Type,
  CheckSquare,
  AlignLeft,
  GitMerge,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
} from "../../../../../service/cbt/ApiQuestion";

const { useBreakpoint } = Grid;

// Import Sub-Components
import OptionSingleMulti from "./OptionSingleMulti";
import OptionTrueFalse from "./OptionTrueFalse";
import OptionMatching from "./OptionMatching";
import OptionShortAnswer from "./OptionShortAnswer"; // Komponen baru
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

  const [form] = Form.useForm();
  const [qType, setQType] = useState(1);
  const [createQuestion, { isLoading: isCreating }] =
    useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] =
    useUpdateQuestionMutation();

  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
      setQType(initialData.q_type);
    } else {
      resetToDefault(1);
    }
  }, [initialData, form]);

  const resetToDefault = (type) => {
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
  };

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
      case 1: // Single Choice
        return <OptionSingleMulti form={form} isMulti={false} />;
      case 2: // Multi Choice
        return <OptionSingleMulti form={form} isMulti={true} />;
      case 3: // Uraian
        return (
          <Alert
            title="Tipe Soal Uraian"
            description="Untuk tipe soal uraian (Essay), tidak ada kunci jawaban otomatis. Jawaban siswa akan diperiksa secara manual oleh guru."
            type="warning"
            showIcon
          />
        );
      case 4: // Isian Singkat
        return <OptionShortAnswer />;
      case 5: // Benar / Salah
        return <OptionTrueFalse form={form} />;
      case 6: // Menjodohkan
        return <OptionMatching />;
      default:
        return null;
    }
  };

  return (
    <Card hoverable>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ q_type: 1, score_weight: 1 }}
      >
        <Flex
          justify="space-between"
          align="center"
          gap={screens.sm ? "large" : "small"}
          wrap
        >
          <Form.Item
            name="q_type"
            label="Tipe Soal"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <Select onChange={handleTypeChange} size="large">
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
          >
            <InputNumber min={1} style={{ width: "100%" }} size="large" />
          </Form.Item>
        </Flex>

        <Divider />

        <Form.Item
          name="content"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>Pertanyaan</span>
          }
          rules={[{ required: true, message: "Tulis pertanyaan soal" }]}
        >
          <TextEditor
            placeholder="Tulis soal disini (Gunakan toolbar untuk insert gambar/rumus)..."
            height="300px"
          />
        </Form.Item>

        <div style={{ background: "#fff", marginTop: 40 }}>
          <Divider titlePlacement="left" style={{ borderColor: "#eee" }}>
            Kunci Jawaban & Opsi
          </Divider>
          {renderOptions()}
        </div>

        <Divider />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button onClick={onCancel} disabled={isLoading} size="large">
            Batal
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<Save size={18} />}
            loading={isLoading}
            size="large"
          >
            {initialData ? "Perbarui Soal" : "Simpan Soal"}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default QuestionForm;
