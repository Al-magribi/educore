import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
  Upload,
} from "antd";
import {
  CalendarDays,
  Download,
  FileBadge,
  HeartHandshake,
  PencilLine,
  Trash2,
  Upload as UploadIcon,
  UserRound,
  Users,
} from "lucide-react";
import {
  useDeleteStudentDocumentMutation,
  useGetStudentDocumentsQuery,
  useUploadStudentDocumentMutation,
} from "../../../service/database/ApiDatabase";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const modalStyles = {
  body: {
    maxHeight: "calc(100vh - 180px)",
    overflow: "auto",
    padding: 0,
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(15, 23, 42, 0.22) transparent",
  },
  content: {
    overflow: "hidden",
    borderRadius: 28,
    padding: 0,
  },
  header: {
    display: "none",
  },
};

const heroStyle = {
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 26%), linear-gradient(135deg, #0f172a 0%, #14532d 50%, #22c55e 100%)",
  color: "#fff",
  padding: 24,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
};

const shellStyle = {
  background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
};

const sectionCardStyle = {
  borderRadius: 22,
  border: "1px solid #e6eef8",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.07)",
  overflow: "hidden",
};

const innerFamilyCardStyle = {
  borderRadius: 18,
  border: "1px solid #e6eef8",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const iconWrapStyle = (background, color, size = 46) => ({
  width: size,
  height: size,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  flexShrink: 0,
});

const normalizeDateInput = (value) => {
  if (!value) return undefined;
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

const DOCUMENT_TYPE_OPTIONS = [
  { label: "Ijazah", value: "ijazah" },
  { label: "Akta Kelahiran", value: "akta_kelahiran" },
  { label: "Kartu Keluarga", value: "kartu_keluarga" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatFileSize = (value) => {
  const size = Number(value || 0);
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const renderTabLabel = (icon, title, subtitle) => (
  <Space size={10} align='center' wrap={false}>
    {icon}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
      <Text
        type='secondary'
        style={{ fontSize: 12, display: "block", whiteSpace: "normal" }}
      >
        {subtitle}
      </Text>
    </div>
  </Space>
);

const renderSectionTitle = (icon, title, subtitle) => (
  <Space align='center' size={12} wrap={false} style={{ width: "100%" }}>
    {icon}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{title}</div>
      <Text
        type='secondary'
        style={{ fontSize: 12, display: "block", whiteSpace: "normal" }}
      >
        {subtitle}
      </Text>
    </div>
  </Space>
);

const DbForm = ({ open, onCancel, onSubmit, loading, student }) => {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmallMobile = !screens.sm;
  const formId = "db-student-form";
  const siblingCount = student?.siblings?.length || 0;
  const studentId = student?.student_id;
  const [selectedDocumentType, setSelectedDocumentType] = useState();
  const [selectedFileList, setSelectedFileList] = useState([]);
  const [uploadStudentDocument, { isLoading: isUploadingDocument }] =
    useUploadStudentDocumentMutation();
  const [deleteStudentDocument, { isLoading: isDeletingDocument }] =
    useDeleteStudentDocumentMutation();
  const { data: documentResponse, isLoading: isLoadingDocuments } =
    useGetStudentDocumentsQuery(studentId, {
      skip: !open || !studentId,
    });
  const documentOptions = documentResponse?.options || DOCUMENT_TYPE_OPTIONS;
  const documents = documentResponse?.data || [];
  const isDocumentBusy = isUploadingDocument || isDeletingDocument;

  useEffect(() => {
    if (!open) return;

    if (!student) {
      form.resetFields();
      setSelectedDocumentType(undefined);
      setSelectedFileList([]);
      return;
    }

    form.setFieldsValue({
      full_name: student.full_name,
      gender: student.gender,
      nis: student.nis,
      nisn: student.nisn,
      birth_place: student.birth_place,
      birth_date: normalizeDateInput(student.birth_date),
      height: student.height,
      weight: student.weight,
      head_circumference: student.head_circumference,
      order_number: student.order_number,
      siblings_count: student.siblings_count,
      postal_code: student.postal_code,
      address: student.address,
      father_name: student.father_name,
      father_nik: student.father_nik,
      father_birth_place: student.father_birth_place,
      father_birth_date: normalizeDateInput(student.father_birth_date),
      father_phone: student.father_phone,
      mother_name: student.mother_name,
      mother_nik: student.mother_nik,
      mother_birth_place: student.mother_birth_place,
      mother_birth_date: normalizeDateInput(student.mother_birth_date),
      mother_phone: student.mother_phone,
      siblings: (student.siblings || []).map((item) => ({
        name: item.name,
        gender: item.gender,
        birth_date: normalizeDateInput(item.birth_date),
      })),
    });
    setSelectedDocumentType(undefined);
    setSelectedFileList([]);
  }, [form, open, student]);

  const handleFinish = (values) => {
    onSubmit({
      ...values,
      siblings: values.siblings || [],
    });
  };

  const handleUploadDocument = async () => {
    const file = selectedFileList[0]?.originFileObj;

    if (!studentId) {
      message.error("Data siswa tidak ditemukan.");
      return;
    }

    if (!selectedDocumentType) {
      message.error("Pilih jenis berkas terlebih dahulu.");
      return;
    }

    if (!file) {
      message.error("Pilih file yang ingin diupload.");
      return;
    }

    const formData = new FormData();
    formData.append("document_type", selectedDocumentType);
    formData.append("file", file);

    try {
      await uploadStudentDocument({ studentId, body: formData }).unwrap();
      message.success("Berkas siswa berhasil disimpan.");
      setSelectedDocumentType(undefined);
      setSelectedFileList([]);
    } catch (error) {
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        "Gagal menyimpan berkas siswa.";
      message.error(errorMessage);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!studentId) return;

    try {
      await deleteStudentDocument({ studentId, documentId }).unwrap();
      message.success("Berkas siswa berhasil dihapus.");
    } catch (error) {
      message.error(
        error?.data?.message || error?.message || "Gagal menghapus berkas siswa.",
      );
    }
  };

  const handleDownloadDocument = async (documentId, fallbackName) => {
    if (!studentId) return;

    try {
      const response = await fetch(
        `/api/database/students/${studentId}/documents/${documentId}/download`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        let messageText = "Gagal mengunduh berkas siswa.";

        try {
          const errorData = await response.json();
          messageText = errorData?.message || messageText;
        } catch {
          // Abaikan error parsing karena response download bisa berupa blob.
        }

        throw new Error(messageText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fallbackName || "berkas-siswa";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error.message || "Gagal mengunduh berkas siswa.");
    }
  };

  const commonInputSize = isSmallMobile ? "middle" : "large";
  const heroPadding = isSmallMobile ? 16 : isMobile ? 20 : 24;
  const bodyPadding = isSmallMobile ? 16 : isMobile ? 20 : 24;

  return (
    <>
      <style>
        {`
          .db-form-modal .ant-modal-body::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }

          .db-form-modal .ant-modal-body::-webkit-scrollbar-track {
            background: transparent;
          }

          .db-form-modal .ant-modal-body::-webkit-scrollbar-thumb {
            background: rgba(15, 23, 42, 0.22);
            border-radius: 999px;
          }

          .db-form-modal .ant-modal-body::-webkit-scrollbar-thumb:hover {
            background: rgba(15, 23, 42, 0.3);
          }
        `}
      </style>
      <Modal
        open={open}
        onCancel={onCancel}
        width={isMobile ? "calc(100vw - 16px)" : 980}
        footer={null}
        destroyOnHidden
        forceRender
        centered
        styles={modalStyles}
        wrapClassName='db-form-modal'
      >
        <div style={shellStyle}>
          <div style={{ ...heroStyle, padding: heroPadding }}>
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} lg={15}>
                <Space direction='vertical' size={10} style={{ width: "100%" }}>
                  <div
                    style={iconWrapStyle(
                      "rgba(255,255,255,0.14)",
                      "#ffffff",
                      isSmallMobile ? 48 : 56,
                    )}
                  >
                    <PencilLine size={isSmallMobile ? 20 : 24} />
                  </div>
                  <div>
                    <Title
                      level={isSmallMobile ? 4 : 3}
                      style={{
                        color: "#ffffff",
                        margin: 0,
                        marginBottom: 6,
                        fontSize: isSmallMobile ? 24 : undefined,
                      }}
                    >
                      Perbarui Database Siswa
                    </Title>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        display: "block",
                        fontSize: isSmallMobile ? 13 : 14,
                      }}
                    >
                      Kelola data identitas, informasi orang tua, dan anggota
                      keluarga siswa dalam satu formulir yang terstruktur.
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={9}>
                <Card
                  bordered={false}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "none",
                  }}
                  bodyStyle={{ padding: isSmallMobile ? 14 : 16 }}
                >
                  <Space
                    direction='vertical'
                    size={8}
                    style={{ width: "100%" }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      Siswa terpilih
                    </Text>
                    <Text
                      strong
                      style={{
                        color: "#ffffff",
                        fontSize: isSmallMobile ? 15 : 16,
                        lineHeight: 1.4,
                      }}
                    >
                      {student?.full_name || "-"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      NIS: {student?.nis || "-"} | Keluarga: {siblingCount} data
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>

          <div style={{ padding: bodyPadding }}>
            <Form
              id={formId}
              form={form}
              layout='vertical'
              onFinish={handleFinish}
            >
              <MotionDiv
                variants={containerVariants}
                initial='hidden'
                animate='show'
                style={{ width: "100%" }}
              >
                <Space vertical size={18} style={{ width: "100%" }}>
                  <MotionDiv variants={itemVariants}>
                    <Tabs
                      size={isSmallMobile ? "small" : "middle"}
                      tabBarGutter={8}
                      animated
                      items={[
                        {
                          key: "personal",
                          label: renderTabLabel(
                            <span
                              style={iconWrapStyle("#dbeafe", "#1d4ed8", 40)}
                            >
                              <UserRound size={18} />
                            </span>,
                            "Informasi Pribadi",
                            "Identitas dasar siswa",
                          ),
                          children: (
                            <MotionDiv variants={itemVariants}>
                              <Card
                                size='small'
                                style={sectionCardStyle}
                                bodyStyle={{ padding: isSmallMobile ? 16 : 20 }}
                              >
                                <Row gutter={[12, 8]}>
                                  <Col xs={24} md={12}>
                                    <Form.Item
                                      label='Nama Lengkap'
                                      name='full_name'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Nama lengkap siswa'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={12}>
                                    <Form.Item
                                      label='Jenis Kelamin'
                                      name='gender'
                                    >
                                      <Select
                                        allowClear
                                        size={commonInputSize}
                                        placeholder='Pilih jenis kelamin'
                                        options={[
                                          {
                                            label: "Laki-laki",
                                            value: "Laki-laki",
                                          },
                                          {
                                            label: "Perempuan",
                                            value: "Perempuan",
                                          },
                                        ]}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item label='NIS' name='nis'>
                                      <Input
                                        size={commonInputSize}
                                        placeholder='NIS'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item label='NISN' name='nisn'>
                                      <Input
                                        size={commonInputSize}
                                        placeholder='NISN'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Tempat Lahir'
                                      name='birth_place'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Tempat lahir'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Tanggal Lahir'
                                      name='birth_date'
                                    >
                                      <Input
                                        type='date'
                                        size={commonInputSize}
                                        prefix={<CalendarDays size={16} />}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item label='Tinggi' name='height'>
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Contoh: 160 cm'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item label='Berat' name='weight'>
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Contoh: 52 kg'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Kepala'
                                      name='head_circumference'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Lingkar kepala'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Anak Ke-'
                                      name='order_number'
                                    >
                                      <InputNumber
                                        min={1}
                                        size={commonInputSize}
                                        style={{ width: "100%" }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Jumlah Saudara'
                                      name='siblings_count'
                                    >
                                      <InputNumber
                                        min={0}
                                        size={commonInputSize}
                                        style={{ width: "100%" }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Kode Pos'
                                      name='postal_code'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Kode pos'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24}>
                                    <Form.Item
                                      label='Alamat Lengkap'
                                      name='address'
                                    >
                                      <Input.TextArea
                                        rows={4}
                                        placeholder='Alamat lengkap siswa'
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </Card>
                            </MotionDiv>
                          ),
                        },
                        {
                          key: "parents",
                          label: renderTabLabel(
                            <span
                              style={iconWrapStyle("#dcfce7", "#15803d", 40)}
                            >
                              <HeartHandshake size={18} />
                            </span>,
                            "Informasi Orang Tua",
                            "Data ayah dan ibu",
                          ),
                          children: (
                            <MotionDiv variants={itemVariants}>
                              <Card
                                size='small'
                                style={sectionCardStyle}
                                bodyStyle={{ padding: isSmallMobile ? 16 : 20 }}
                              >
                                <Row gutter={[12, 8]}>
                                  <Col xs={24} md={12}>
                                    <Form.Item
                                      label='Nama Ayah'
                                      name='father_name'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Nama ayah'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={12}>
                                    <Form.Item
                                      label='NIK Ayah'
                                      name='father_nik'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='NIK ayah'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Tempat Lahir Ayah'
                                      name='father_birth_place'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Tempat lahir ayah'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Tanggal Lahir Ayah'
                                      name='father_birth_date'
                                    >
                                      <Input
                                        type='date'
                                        size={commonInputSize}
                                        prefix={<CalendarDays size={16} />}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='No Tlp Ayah'
                                      name='father_phone'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='No telepon ayah'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={12}>
                                    <Form.Item
                                      label='Nama Ibu'
                                      name='mother_name'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Nama ibu'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={12}>
                                    <Form.Item
                                      label='NIK Ibu'
                                      name='mother_nik'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='NIK ibu'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Tempat Lahir Ibu'
                                      name='mother_birth_place'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='Tempat lahir ibu'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='Tanggal Lahir Ibu'
                                      name='mother_birth_date'
                                    >
                                      <Input
                                        type='date'
                                        size={commonInputSize}
                                        prefix={<CalendarDays size={16} />}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <Form.Item
                                      label='No Tlp Ibu'
                                      name='mother_phone'
                                    >
                                      <Input
                                        size={commonInputSize}
                                        placeholder='No telepon ibu'
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </Card>
                            </MotionDiv>
                          ),
                        },
                        {
                          key: "family",
                          label: renderTabLabel(
                            <span
                              style={iconWrapStyle("#ffedd5", "#c2410c", 40)}
                            >
                              <Users size={18} />
                            </span>,
                            "Informasi Keluarga",
                            "Selain orang tua",
                          ),
                          children: (
                            <MotionDiv variants={itemVariants}>
                              <Card
                                size='small'
                                style={sectionCardStyle}
                                bodyStyle={{ padding: isSmallMobile ? 16 : 20 }}
                              >
                                <Form.List name='siblings'>
                                  {(fields, { add, remove }) => (
                                    <Space
                                      direction='vertical'
                                      size={12}
                                      style={{ width: "100%" }}
                                    >
                                      {fields.map((field, index) => (
                                        <MotionDiv
                                          key={field.key}
                                          variants={itemVariants}
                                          whileHover={{ y: -2 }}
                                          transition={{ duration: 0.18 }}
                                        >
                                          <Card
                                            size='small'
                                            type='inner'
                                            title={`Anggota Keluarga ${index + 1}`}
                                            extra={
                                              <Button
                                                type='text'
                                                danger
                                                icon={<Trash2 size={16} />}
                                                onClick={() =>
                                                  remove(field.name)
                                                }
                                              >
                                                Hapus
                                              </Button>
                                            }
                                            style={innerFamilyCardStyle}
                                            bodyStyle={{
                                              padding: isSmallMobile ? 14 : 16,
                                            }}
                                          >
                                            <Row gutter={[12, 8]}>
                                              <Col xs={24} md={10}>
                                                <Form.Item
                                                  label='Nama'
                                                  name={[field.name, "name"]}
                                                  rules={[
                                                    {
                                                      required: true,
                                                      message:
                                                        "Nama anggota keluarga wajib diisi",
                                                    },
                                                  ]}
                                                >
                                                  <Input
                                                    size={commonInputSize}
                                                    placeholder='Nama anggota keluarga'
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col xs={24} md={7}>
                                                <Form.Item
                                                  label='Jenis Kelamin'
                                                  name={[field.name, "gender"]}
                                                >
                                                  <Select
                                                    allowClear
                                                    size={commonInputSize}
                                                    placeholder='Jenis kelamin'
                                                    options={[
                                                      {
                                                        label: "Laki-laki",
                                                        value: "Laki-laki",
                                                      },
                                                      {
                                                        label: "Perempuan",
                                                        value: "Perempuan",
                                                      },
                                                    ]}
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col xs={24} md={7}>
                                                <Form.Item
                                                  label='Tanggal Lahir'
                                                  name={[
                                                    field.name,
                                                    "birth_date",
                                                  ]}
                                                >
                                                  <Input
                                                    type='date'
                                                    size={commonInputSize}
                                                    prefix={
                                                      <CalendarDays size={16} />
                                                    }
                                                  />
                                                </Form.Item>
                                              </Col>
                                            </Row>
                                          </Card>
                                        </MotionDiv>
                                      ))}

                                      <Card
                                        size='small'
                                        style={innerFamilyCardStyle}
                                        bodyStyle={{
                                          padding: isSmallMobile ? 14 : 16,
                                        }}
                                      >
                                        <Space
                                          direction='vertical'
                                          size={10}
                                          style={{ width: "100%" }}
                                        >
                                          <Button
                                            type='dashed'
                                            size={commonInputSize}
                                            onClick={() => add()}
                                            style={{
                                              width: "100%",
                                              borderStyle: "dashed",
                                              height: isSmallMobile ? 40 : 44,
                                            }}
                                          >
                                            + Tambah Anggota Keluarga
                                          </Button>
                                          <Text
                                            type='secondary'
                                            style={{ fontSize: 12 }}
                                          >
                                            Untuk status lengkap, minimal isi 1
                                            anggota keluarga.
                                          </Text>
                                        </Space>
                                      </Card>
                                    </Space>
                                  )}
                                </Form.List>
                              </Card>
                            </MotionDiv>
                          ),
                        },
                        {
                          key: "documents",
                          label: renderTabLabel(
                            <span
                              style={iconWrapStyle("#ede9fe", "#7c3aed", 40)}
                            >
                              <FileBadge size={18} />
                            </span>,
                            "Berkas Siswa",
                            "Upload dan download dokumen",
                          ),
                          children: (
                            <MotionDiv variants={itemVariants}>
                              <Space
                                direction='vertical'
                                size={16}
                                style={{ width: "100%" }}
                              >
                                <Card
                                  size='small'
                                  style={sectionCardStyle}
                                  bodyStyle={{
                                    padding: isSmallMobile ? 16 : 20,
                                  }}
                                >
                                  <Space
                                    direction='vertical'
                                    size={14}
                                    style={{ width: "100%" }}
                                  >
                                    <Alert
                                      type='info'
                                      showIcon
                                      message='Pilihan berkas'
                                      description='Berkas yang dapat diupload: Ijazah, Akta Kelahiran, dan Kartu Keluarga. Upload ulang pada jenis yang sama akan menggantikan file sebelumnya.'
                                    />

                                    <Row gutter={[12, 12]}>
                                      <Col xs={24} md={8}>
                                        <Select
                                          allowClear
                                          size={commonInputSize}
                                          placeholder='Pilih jenis berkas'
                                          value={selectedDocumentType}
                                          options={documentOptions}
                                          onChange={setSelectedDocumentType}
                                          style={{ width: "100%" }}
                                        />
                                      </Col>
                                      <Col xs={24} md={10}>
                                        <Upload
                                          beforeUpload={() => false}
                                          maxCount={1}
                                          fileList={selectedFileList}
                                          onChange={({ fileList }) =>
                                            setSelectedFileList(
                                              fileList.slice(-1),
                                            )
                                          }
                                          style={{ width: "100%" }}
                                        >
                                          <Button
                                            size={commonInputSize}
                                            icon={<UploadIcon size={16} />}
                                            style={{ width: "100%" }}
                                          >
                                            Pilih File
                                          </Button>
                                        </Upload>
                                      </Col>
                                      <Col xs={24} md={6}>
                                        <Button
                                          type='primary'
                                          size={commonInputSize}
                                          block
                                          loading={isUploadingDocument}
                                          disabled={!studentId}
                                          onClick={handleUploadDocument}
                                        >
                                          Upload Berkas
                                        </Button>
                                      </Col>
                                    </Row>

                                    <Text
                                      type='secondary'
                                      style={{ fontSize: 12 }}
                                    >
                                      Format file: PDF, JPG, JPEG, PNG. Maksimal
                                      5 MB per file.
                                    </Text>
                                  </Space>
                                </Card>

                                <Card
                                  size='small'
                                  style={sectionCardStyle}
                                  bodyStyle={{
                                    padding: isSmallMobile ? 16 : 20,
                                  }}
                                >
                                  <Space
                                    direction='vertical'
                                    size={12}
                                    style={{ width: "100%" }}
                                  >
                                    {documentOptions.map((option) => {
                                      const document = documents.find(
                                        (item) =>
                                          item.document_type === option.value,
                                      );

                                      return (
                                        <Card
                                          key={option.value}
                                          size='small'
                                          type='inner'
                                          style={innerFamilyCardStyle}
                                          bodyStyle={{
                                            padding: isSmallMobile ? 14 : 16,
                                          }}
                                        >
                                          <Flex
                                            vertical={isSmallMobile}
                                            align={
                                              isSmallMobile
                                                ? "stretch"
                                                : "center"
                                            }
                                            justify='space-between'
                                            gap={12}
                                          >
                                            <Space
                                              direction='vertical'
                                              size={4}
                                              style={{ flex: 1 }}
                                            >
                                              <Text strong>{option.label}</Text>
                                              {document ? (
                                                <>
                                                  <Text>
                                                    {document.file_name}
                                                  </Text>
                                                  <Text type='secondary'>
                                                    Ukuran:{" "}
                                                    {formatFileSize(
                                                      document.file_size,
                                                    )}{" "}
                                                    | Upload:{" "}
                                                    {formatDateTime(
                                                      document.updated_at,
                                                    )}
                                                  </Text>
                                                  <Text type='secondary'>
                                                    Pengunggah:{" "}
                                                    {document.uploader_name ||
                                                      "-"}
                                                  </Text>
                                                </>
                                              ) : (
                                                <Text type='secondary'>
                                                  Belum ada berkas untuk jenis
                                                  ini.
                                                </Text>
                                              )}
                                            </Space>

                                            <Space
                                              direction={
                                                isSmallMobile
                                                  ? "vertical"
                                                  : "horizontal"
                                              }
                                              style={{
                                                width: isSmallMobile
                                                  ? "100%"
                                                  : "auto",
                                              }}
                                            >
                                              <Button
                                                icon={<Download size={16} />}
                                                disabled={!document}
                                                onClick={() =>
                                                  handleDownloadDocument(
                                                    document?.id,
                                                    document?.file_name,
                                                  )
                                                }
                                              >
                                                Download
                                              </Button>
                                              <Popconfirm
                                                title='Hapus berkas ini?'
                                                description='Tindakan ini akan menghapus file dari server.'
                                                okText='Hapus'
                                                cancelText='Batal'
                                                onConfirm={() =>
                                                  handleDeleteDocument(
                                                    document?.id,
                                                  )
                                                }
                                                disabled={!document}
                                              >
                                                <Button
                                                  danger
                                                  icon={<Trash2 size={16} />}
                                                  disabled={
                                                    !document || isDocumentBusy
                                                  }
                                                  loading={isDeletingDocument}
                                                >
                                                  Hapus
                                                </Button>
                                              </Popconfirm>
                                            </Space>
                                          </Flex>
                                        </Card>
                                      );
                                    })}

                                    {!isLoadingDocuments &&
                                      documents.length === 0 && (
                                        <Empty
                                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                                          description='Belum ada berkas yang diupload.'
                                        />
                                      )}

                                    {isLoadingDocuments && (
                                      <List
                                        dataSource={[1, 2, 3]}
                                        renderItem={() => (
                                          <List.Item>
                                            <Text type='secondary'>
                                              Memuat data berkas...
                                            </Text>
                                          </List.Item>
                                        )}
                                      />
                                    )}
                                  </Space>
                                </Card>
                              </Space>
                            </MotionDiv>
                          ),
                        },
                      ]}
                    />
                  </MotionDiv>

                  <MotionDiv variants={itemVariants}>
                    <Card
                      style={sectionCardStyle}
                      bodyStyle={{
                        padding: isSmallMobile ? 14 : 18,
                        background:
                          "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                      }}
                    >
                      <Flex
                        vertical={isSmallMobile ? true : false}
                        align='center'
                        justify='space-between'
                      >
                        <Space direction='vertical' size={2}>
                          <Text strong style={{ color: "#0f172a" }}>
                            Simpan perubahan database siswa
                          </Text>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            Periksa ulang data yang diperbarui sebelum
                            menyimpan.
                          </Text>
                        </Space>

                        <Space
                          direction={isSmallMobile ? "vertical" : "horizontal"}
                          size={10}
                          style={{ width: isSmallMobile ? "100%" : "auto" }}
                        >
                          <Button
                            onClick={onCancel}
                            size={commonInputSize}
                            style={{ width: isSmallMobile ? "100%" : "auto" }}
                          >
                            Batal
                          </Button>
                          <Button
                            type='primary'
                            htmlType='submit'
                            form={formId}
                            loading={loading}
                            size={commonInputSize}
                            style={{
                              width: isSmallMobile ? "100%" : "auto",
                              minWidth: isSmallMobile ? undefined : 170,
                            }}
                          >
                            Simpan Perubahan
                          </Button>
                        </Space>
                      </Flex>
                    </Card>
                  </MotionDiv>
                </Space>
              </MotionDiv>
            </Form>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DbForm;
