import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Flex,
  Form,
  Grid,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import { Plus, Trash2 } from "lucide-react";
import {
  useAddTeachingModuleMutation,
  useGetTeachingModuleDetailQuery,
  useUpdateTeachingModuleMutation,
} from "../../../service/lms/ApiTeachingModule";
import ModuleCoverInput from "./ModuleCoverInput";
import ModuleRichEditor from "./ModuleRichEditor";
import {
  APPENDIX_SECTIONS,
  IDENTITY_FIELDS,
  MEETING_PARTS,
  PANCASILA_PROFILE_OPTIONS,
  buildDefaultContent,
  createEmptyMeeting,
  normalizeContent,
} from "./moduleSchema";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const GENERAL_EDITORS = [
  {
    key: "initial_competence",
    label: "B. Kompetensi Awal",
    placeholder: "Capaian Pembelajaran fase dan elemen yang relevan.",
  },
  {
    key: "facilities",
    label: "D. Sarana dan Prasarana",
    placeholder: "Media, alat, dan sumber belajar yang dibutuhkan.",
  },
  {
    key: "target_students",
    label: "E. Target Peserta Didik",
    placeholder: "Contoh: peserta didik reguler/tipikal.",
  },
  {
    key: "learning_model",
    label: "F. Model Pembelajaran",
    placeholder: "Contoh: pembelajaran tatap muka.",
  },
];

const CORE_EDITORS_BEFORE = [
  {
    key: "objectives",
    label: "A. Tujuan Kegiatan Pembelajaran",
    placeholder: "Tujuan pembelajaran bab dan per pertemuan.",
  },
  {
    key: "meaningful_understanding",
    label: "B. Pemahaman Bermakna",
    placeholder: "Pemahaman yang akan diperoleh peserta didik.",
  },
  {
    key: "trigger_questions",
    label: "C. Pertanyaan Pemantik",
    placeholder: "Pertanyaan atau aktivitas pemantik.",
  },
];

const CORE_EDITORS_AFTER = [
  {
    key: "reflection",
    label: "E. Refleksi",
    placeholder: "Aktivitas refleksi peserta didik dan guru.",
  },
  {
    key: "assessment",
    label: "F. Penilaian",
    placeholder: "Penilaian sikap, pengetahuan, dan keterampilan.",
  },
  {
    key: "enrichment_remedial",
    label: "G. Kegiatan Pengayaan dan Remedial",
    placeholder: "Tindak lanjut remedial dan pengayaan.",
  },
];

const APPENDIX_PLACEHOLDERS = {
  worksheets: "Lembar kerja peserta didik (LKPD).",
  reading_materials: "Bahan bacaan untuk guru dan peserta didik.",
  glossary: "Istilah penting beserta artinya.",
  bibliography: "Sumber rujukan.",
};

const sectionCardStyle = { borderRadius: 12, marginBottom: 12 };

const EditorItem = ({ name, label, placeholder, minHeight }) => (
  <Form.Item name={name} label={label}>
    <ModuleRichEditor placeholder={placeholder} minHeight={minHeight} />
  </Form.Item>
);

const autoPhaseText = (gradeName) => (gradeName ? `- / ${gradeName} / -` : "");

const TeachingModuleFormDrawer = ({
  open,
  moduleId,
  subjectId,
  meta,
  gradeOptions,
  defaultGradeId,
  onClose,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("general");
  const lastGradeNameRef = useRef("");
  const isEdit = Boolean(moduleId);

  const { currentData: detailRes, isFetching: isLoadingDetail } =
    useGetTeachingModuleDetailQuery(moduleId, {
      skip: !open || !moduleId,
      refetchOnMountOrArgChange: true,
    });
  const [addModule, { isLoading: isAdding }] = useAddTeachingModuleMutation();
  const [updateModule, { isLoading: isUpdating }] =
    useUpdateTeachingModuleMutation();

  const gradeNameOf = (gradeId) =>
    gradeOptions.find((item) => String(item.value) === String(gradeId))
      ?.label || "";

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      const detail = detailRes?.data;
      if (!detail || String(detail.id) !== String(moduleId)) return;
      form.resetFields();
      lastGradeNameRef.current = detail.grade_name || "";
      form.setFieldsValue({
        title: detail.title,
        grade_id: detail.grade_id,
        content: normalizeContent(
          detail.content,
          buildDefaultContent({ meta, gradeName: detail.grade_name }),
        ),
      });
      return;
    }

    form.resetFields();
    const gradeName = gradeNameOf(defaultGradeId);
    lastGradeNameRef.current = gradeName;
    form.setFieldsValue({
      title: "",
      grade_id: defaultGradeId || null,
      content: buildDefaultContent({ meta, gradeName }),
    });
    // gradeOptions/meta cukup dibaca saat drawer dibuka; perubahan berikutnya tidak menimpa isian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, moduleId, detailRes]);

  const handleGradeChange = (gradeId) => {
    const nextGradeName = gradeNameOf(gradeId);
    const currentPhase = form.getFieldValue([
      "content",
      "identity",
      "phase_class_semester",
    ]);
    if (!currentPhase || currentPhase === autoPhaseText(lastGradeNameRef.current)) {
      form.setFieldValue(
        ["content", "identity", "phase_class_semester"],
        autoPhaseText(nextGradeName),
      );
    }
    lastGradeNameRef.current = nextGradeName;
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields(["title", "grade_id"]);
    } catch {
      return;
    }
    const values = form.getFieldsValue(true);
    const payload = {
      title: values.title.trim(),
      grade_id: values.grade_id,
      content: normalizeContent(values.content),
    };

    try {
      if (isEdit) {
        await updateModule({ id: moduleId, ...payload }).unwrap();
        message.success("Modul ajar diperbarui.");
      } else {
        await addModule({ subject_id: subjectId, ...payload }).unwrap();
        message.success("Modul ajar dibuat.");
      }
      onClose();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan modul ajar.");
    }
  };

  const tabItems = [
    {
      key: "general",
      label: "Informasi Umum",
      children: (
        <>
          <Card size='small' title='A. Identitas Modul' style={sectionCardStyle}>
            <Row gutter={[12, 0]}>
              {IDENTITY_FIELDS.map((field) => (
                <Col xs={24} md={12} key={field.key}>
                  <Form.Item
                    name={["content", "identity", field.key]}
                    label={field.label}
                  >
                    <Input
                      placeholder={
                        field.key === "phase_class_semester"
                          ? "Contoh: D / IX / I (Ganjil)"
                          : field.key === "time_allocation"
                            ? "Contoh: 4 Pekan / 12 jam pelajaran"
                            : undefined
                      }
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>
          <Card size='small' style={sectionCardStyle}>
            {GENERAL_EDITORS.slice(0, 1).map((item) => (
              <EditorItem
                key={item.key}
                name={["content", "general", item.key]}
                label={item.label}
                placeholder={item.placeholder}
                minHeight={180}
              />
            ))}
            <Form.Item
              name={["content", "general", "pancasila_profile"]}
              label='C. Profil Pelajar Pancasila'
              extra='Pilih dimensi atau ketik sendiri lalu tekan Enter.'
            >
              <Select
                mode='tags'
                options={PANCASILA_PROFILE_OPTIONS}
                placeholder='Pilih dimensi profil'
              />
            </Form.Item>
            {GENERAL_EDITORS.slice(1).map((item) => (
              <EditorItem
                key={item.key}
                name={["content", "general", item.key]}
                label={item.label}
                placeholder={item.placeholder}
              />
            ))}
          </Card>
        </>
      ),
    },
    {
      key: "core",
      label: "Komponen Inti",
      children: (
        <>
          <Card size='small' style={sectionCardStyle}>
            {CORE_EDITORS_BEFORE.map((item) => (
              <EditorItem
                key={item.key}
                name={["content", "core", item.key]}
                label={item.label}
                placeholder={item.placeholder}
                minHeight={160}
              />
            ))}
          </Card>
          <Card
            size='small'
            title='D. Kegiatan Pembelajaran'
            style={sectionCardStyle}
          >
            <Form.List name={["content", "core", "meetings"]}>
              {(fields, { add, remove }) => (
                <Flex vertical gap={12}>
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size='small'
                      style={{ background: "#f8fafc", borderRadius: 10 }}
                      title={
                        <Form.Item
                          name={[field.name, "title"]}
                          style={{ margin: 0 }}
                        >
                          <Input
                            variant='borderless'
                            style={{ fontWeight: 600, paddingInline: 0 }}
                            placeholder='Contoh: Pertemuan pertama metode Contextual Teaching and Learning'
                          />
                        </Form.Item>
                      }
                      extra={
                        fields.length > 1 ? (
                          <Button
                            type='text'
                            danger
                            icon={<Trash2 size={15} />}
                            onClick={() => remove(field.name)}
                          >
                            {isMobile ? null : "Hapus"}
                          </Button>
                        ) : null
                      }
                    >
                      {MEETING_PARTS.map((part, partIndex) => (
                        <EditorItem
                          key={part.key}
                          name={[field.name, part.key]}
                          label={`${String.fromCharCode(97 + partIndex)}. ${part.label}`}
                          placeholder={`${part.label} pertemuan ${index + 1}.`}
                        />
                      ))}
                    </Card>
                  ))}
                  <Button
                    type='dashed'
                    icon={<Plus size={15} />}
                    onClick={() => add(createEmptyMeeting(fields.length))}
                    block
                  >
                    Tambah Pertemuan
                  </Button>
                </Flex>
              )}
            </Form.List>
            <div style={{ marginTop: 16 }}>
              <EditorItem
                name={["content", "core", "learning_notes"]}
                label='Catatan Kegiatan (opsional)'
                placeholder='Metode alternatif, panduan diferensiasi, penguatan materi, dan lainnya.'
              />
            </div>
          </Card>
          <Card size='small' style={sectionCardStyle}>
            {CORE_EDITORS_AFTER.map((item) => (
              <EditorItem
                key={item.key}
                name={["content", "core", item.key]}
                label={item.label}
                placeholder={item.placeholder}
                minHeight={180}
              />
            ))}
          </Card>
        </>
      ),
    },
    {
      key: "appendix",
      label: "Lampiran",
      children: (
        <Card size='small' style={sectionCardStyle}>
          <Text type='secondary' style={{ display: "block", marginBottom: 12 }}>
            Bagian lampiran yang kosong tidak dicetak di PDF.
          </Text>
          {APPENDIX_SECTIONS.map((section) => (
            <EditorItem
              key={section.key}
              name={["content", "appendix", section.key]}
              label={section.label}
              placeholder={APPENDIX_PLACEHOLDERS[section.key]}
              minHeight={180}
            />
          ))}
        </Card>
      ),
    },
    {
      key: "signature",
      label: "Pengesahan",
      children: (
        <Card size='small' style={sectionCardStyle}>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name={["content", "signature", "city"]}
                label='Kota / Tempat'
              >
                <Input placeholder='Contoh: Cileungsi' />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name={["content", "signature", "date"]}
                label='Tanggal'
                getValueProps={(value) => ({
                  value: value ? dayjs(value) : null,
                })}
                normalize={(value) =>
                  value ? value.format("YYYY-MM-DD") : ""
                }
              >
                <DatePicker format='DD MMMM YYYY' style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name={["content", "signature", "principal_name"]}
                label='Nama Kepala Sekolah'
              >
                <Input placeholder='Nama lengkap beserta gelar' />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name={["content", "signature", "principal_nip"]}
                label='NIP Kepala Sekolah'
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name={["content", "signature", "teacher_name"]}
                label='Nama Guru Mata Pelajaran'
              >
                <Input placeholder='Nama lengkap beserta gelar' />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name={["content", "signature", "teacher_nip"]}
                label='NIP Guru'
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

  const isSaving = isAdding || isUpdating;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      afterOpenChange={(visible) => {
        if (!visible) setActiveTab("general");
      }}
      title={isEdit ? "Edit Modul Ajar" : "Buat Modul Ajar"}
      width={isMobile ? "100%" : 980}
      destroyOnHidden
      maskClosable={false}
      styles={{ body: { background: "#f8fafc", paddingTop: 16 } }}
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button type='primary' loading={isSaving} onClick={handleSubmit}>
            Simpan
          </Button>
        </Space>
      }
    >
      {isEdit && isLoadingDetail && !detailRes ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Form form={form} layout='vertical'>
          <Card size='small' style={sectionCardStyle}>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={6}>
                <Form.Item
                  name={["content", "cover_url"]}
                  label='Cover'
                  extra='Dicetak sebagai halaman pertama PDF. Disarankan ukuran A4 potret.'
                >
                  <ModuleCoverInput />
                </Form.Item>
              </Col>
              <Col xs={24} md={18}>
                <Row gutter={[12, 0]}>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name='title'
                      label='Judul Modul'
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Judul modul wajib diisi.",
                        },
                      ]}
                    >
                      <Input placeholder='Contoh: BAB IV Bersyukur dengan Akikah, Peduli Sesama dengan Berkurban' />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name='grade_id'
                      label='Tingkat'
                      rules={[
                        { required: true, message: "Tingkat wajib dipilih." },
                      ]}
                    >
                      <Select
                        options={gradeOptions}
                        placeholder='Pilih tingkat'
                        onChange={handleGradeChange}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      name={["content", "heading"]}
                      label='Judul Dokumen'
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>
          {gradeOptions.length === 0 ? (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              message='Belum ada tingkat yang Anda ampu pada mata pelajaran ini.'
            />
          ) : null}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </Form>
      )}
    </Drawer>
  );
};

export default TeachingModuleFormDrawer;
