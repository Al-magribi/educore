import React, { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Col,
  Drawer,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import {
  Download,
  FileBadge,
  HeartHandshake,
  PencilLine,
  Plus,
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
import { CardTitle, IconBox, MuseCard } from "../../../components/ui/muse";
import { museColors, museRadius } from "../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const FORM_ID = "db-student-form";

const GENDER_OPTIONS = [
  { label: "Laki-laki", value: "Laki-laki" },
  { label: "Perempuan", value: "Perempuan" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { label: "Ijazah", value: "ijazah" },
  { label: "Akta Kelahiran", value: "akta_kelahiran" },
  { label: "Kartu Keluarga", value: "kartu_keluarga" },
];

const normalizeDateInput = (value) => {
  if (!value) return undefined;
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

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

const SectionCard = ({ icon, title, description, children, extra }) => (
  <MuseCard
    title={<CardTitle icon={icon} title={title} description={description} />}
    extra={extra}
    styles={{ header: { flexWrap: "wrap", gap: 8 } }}
  >
    {children}
  </MuseCard>
);

const DbForm = ({ open, onCancel, onSubmit, loading, student }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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

  useEffect(() => {
    if (!open) return;

    setSelectedDocumentType(undefined);
    setSelectedFileList([]);

    if (!student) {
      form.resetFields();
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
      message.error("Pilih file yang ingin diunggah.");
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
      message.error(error?.data?.message || error?.message || "Gagal menyimpan berkas siswa.");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!studentId) return;

    try {
      await deleteStudentDocument({ studentId, documentId }).unwrap();
      message.success("Berkas siswa berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || error?.message || "Gagal menghapus berkas siswa.");
    }
  };

  const handleDownloadDocument = async (documentId, fallbackName) => {
    if (!studentId) return;

    try {
      const response = await fetch(
        `/api/database/students/${studentId}/documents/${documentId}/download`,
        { method: "GET", credentials: "include" },
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

  const gutter = [16, 0];

  return (
    <Drawer
      open={open}
      onClose={onCancel}
      size={isMobile ? "100%" : 880}
      destroyOnHidden
      forceRender
      title={
        <CardTitle
          icon={<PencilLine size={16} />}
          title='Perbarui Database Siswa'
          description={
            student
              ? `${student.full_name || "-"} · NIS ${student.nis || "-"}`
              : "Lengkapi identitas, orang tua, dan keluarga siswa."
          }
        />
      }
      styles={{ body: { background: museColors.bgLayout, padding: isMobile ? 12 : 24 } }}
      footer={
        <Flex justify='flex-end' gap={8} wrap>
          <Button onClick={onCancel}>Batal</Button>
          <Button type='primary' htmlType='submit' form={FORM_ID} loading={loading}>
            Simpan Perubahan
          </Button>
        </Flex>
      }
    >
      <Form
        id={FORM_ID}
        form={form}
        layout='vertical'
        onFinish={handleFinish}
        scrollToFirstError
        requiredMark={false}
      >
        <Flex vertical gap={isMobile ? 16 : 24}>
          <SectionCard
            icon={<UserRound size={16} />}
            title='Informasi Pribadi'
            description='Identitas dasar siswa.'
          >
            <Row gutter={gutter}>
              <Col xs={24} md={12}>
                <Form.Item label='Nama Lengkap' name='full_name'>
                  <Input placeholder='Nama lengkap siswa' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label='Jenis Kelamin' name='gender'>
                  <Select allowClear placeholder='Pilih jenis kelamin' options={GENDER_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='NIS' name='nis'>
                  <Input placeholder='NIS' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='NISN' name='nisn'>
                  <Input placeholder='NISN' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='Tempat Lahir' name='birth_place'>
                  <Input placeholder='Tempat lahir' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='Tanggal Lahir' name='birth_date'>
                  <Input type='date' />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item label='Tinggi' name='height'>
                  <Input placeholder='Contoh: 160 cm' />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item label='Berat' name='weight'>
                  <Input placeholder='Contoh: 52 kg' />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item label='Lingkar Kepala' name='head_circumference'>
                  <Input placeholder='Contoh: 54 cm' />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item label='Anak Ke-' name='order_number'>
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item label='Jumlah Saudara' name='siblings_count'>
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item label='Kode Pos' name='postal_code'>
                  <Input placeholder='Kode pos' />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label='Alamat Lengkap' name='address' style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={3} placeholder='Alamat lengkap siswa' />
                </Form.Item>
              </Col>
            </Row>
          </SectionCard>

          <SectionCard
            icon={<HeartHandshake size={16} />}
            title='Informasi Orang Tua'
            description='Data ayah dan ibu.'
          >
            <Row gutter={gutter}>
              <Col xs={24} md={12}>
                <Form.Item label='Nama Ayah' name='father_name'>
                  <Input placeholder='Nama ayah' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label='NIK Ayah' name='father_nik'>
                  <Input placeholder='NIK ayah' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='Tempat Lahir Ayah' name='father_birth_place'>
                  <Input placeholder='Tempat lahir ayah' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='Tanggal Lahir Ayah' name='father_birth_date'>
                  <Input type='date' />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label='No. Telepon Ayah' name='father_phone'>
                  <Input placeholder='08xxxxxxxxxx' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label='Nama Ibu' name='mother_name'>
                  <Input placeholder='Nama ibu' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label='NIK Ibu' name='mother_nik'>
                  <Input placeholder='NIK ibu' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='Tempat Lahir Ibu' name='mother_birth_place'>
                  <Input placeholder='Tempat lahir ibu' />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label='Tanggal Lahir Ibu' name='mother_birth_date'>
                  <Input type='date' />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label='No. Telepon Ibu' name='mother_phone' style={{ marginBottom: 0 }}>
                  <Input placeholder='08xxxxxxxxxx' />
                </Form.Item>
              </Col>
            </Row>
          </SectionCard>

          <Form.List name='siblings'>
            {(fields, { add, remove }) => (
              <SectionCard
                icon={<Users size={16} />}
                title='Anggota Keluarga Lain'
                description='Untuk status lengkap, isi minimal 1 anggota keluarga.'
                extra={
                  <Button icon={<Plus size={16} />} onClick={() => add()}>
                    Tambah
                  </Button>
                }
              >
                {fields.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description='Belum ada anggota keluarga. Klik Tambah untuk menambahkan.'
                  />
                ) : (
                  <Flex vertical gap={12}>
                    {fields.map((field, index) => (
                      <div
                        key={field.key}
                        style={{
                          padding: 16,
                          borderRadius: museRadius.card,
                          border: `1px solid ${museColors.divider}`,
                        }}
                      >
                        <Flex justify='space-between' align='center' style={{ marginBottom: 8 }}>
                          <Text strong>Anggota {index + 1}</Text>
                          <Tooltip title='Hapus anggota'>
                            <Button
                              type='text'
                              danger
                              aria-label={`Hapus anggota ${index + 1}`}
                              icon={<Trash2 size={16} />}
                              onClick={() => remove(field.name)}
                            />
                          </Tooltip>
                        </Flex>
                        <Row gutter={gutter}>
                          <Col xs={24} md={10}>
                            <Form.Item
                              label='Nama'
                              name={[field.name, "name"]}
                              rules={[{ required: true, message: "Nama anggota keluarga wajib diisi" }]}
                            >
                              <Input placeholder='Nama anggota keluarga' />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={7}>
                            <Form.Item
                              label='Jenis Kelamin'
                              name={[field.name, "gender"]}
                              style={{ marginBottom: isMobile ? undefined : 0 }}
                            >
                              <Select allowClear placeholder='Pilih' options={GENDER_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={7}>
                            <Form.Item
                              label='Tanggal Lahir'
                              name={[field.name, "birth_date"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input type='date' />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </Flex>
                )}
              </SectionCard>
            )}
          </Form.List>

          {studentId ? (
            <SectionCard
              icon={<FileBadge size={16} />}
              title='Berkas Siswa'
              description='Berkas langsung tersimpan saat diunggah, terpisah dari tombol Simpan.'
            >
              <Flex vertical gap={16}>
                <Alert
                  type='info'
                  showIcon
                  title='Ijazah, Akta Kelahiran, dan Kartu Keluarga'
                  description='Format PDF, JPG, atau PNG, maksimal 5 MB. Unggah ulang pada jenis yang sama akan mengganti file sebelumnya.'
                />

                <Row gutter={[12, 12]}>
                  <Col xs={24} md={8}>
                    <Select
                      allowClear
                      aria-label='Jenis berkas'
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
                      accept='.pdf,.jpg,.jpeg,.png'
                      fileList={selectedFileList}
                      onChange={({ fileList }) => setSelectedFileList(fileList.slice(-1))}
                      style={{ width: "100%" }}
                    >
                      <Button icon={<UploadIcon size={16} />} block>
                        Pilih File
                      </Button>
                    </Upload>
                  </Col>
                  <Col xs={24} md={6}>
                    <Button block loading={isUploadingDocument} onClick={handleUploadDocument}>
                      Unggah Berkas
                    </Button>
                  </Col>
                </Row>

                {isLoadingDocuments ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : (
                  <Flex vertical gap={8}>
                    {documentOptions.map((option) => {
                      const doc = documents.find((item) => item.document_type === option.value);

                      return (
                        <Flex
                          key={option.value}
                          align='center'
                          gap={12}
                          wrap={isMobile}
                          style={{
                            padding: "12px 16px",
                            borderRadius: museRadius.item,
                            border: `1px solid ${museColors.divider}`,
                          }}
                        >
                          <IconBox
                            icon={<FileBadge size={18} />}
                            tone={doc ? "primary" : "bgSoft"}
                            size={36}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong style={{ display: "block" }}>
                              {option.label}
                            </Text>
                            {doc ? (
                              <Text type='secondary' style={{ fontSize: 12, display: "block" }} ellipsis>
                                {doc.file_name} · {formatFileSize(doc.file_size)} ·{" "}
                                {formatDateTime(doc.updated_at)} · {doc.uploader_name || "-"}
                              </Text>
                            ) : (
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                Belum diunggah
                              </Text>
                            )}
                          </div>
                          <Flex gap={4} style={{ flexShrink: 0 }}>
                            <Tooltip title='Unduh'>
                              <Button
                                type='text'
                                aria-label={`Unduh ${option.label}`}
                                icon={<Download size={16} />}
                                disabled={!doc}
                                onClick={() => handleDownloadDocument(doc?.id, doc?.file_name)}
                              />
                            </Tooltip>
                            <Popconfirm
                              title={`Hapus berkas ${option.label}?`}
                              description='File akan dihapus dari server.'
                              okText='Ya, Hapus'
                              cancelText='Batal'
                              okButtonProps={{ danger: true, loading: isDeletingDocument }}
                              onConfirm={() => handleDeleteDocument(doc?.id)}
                              disabled={!doc}
                            >
                              <Tooltip title='Hapus'>
                                <Button
                                  type='text'
                                  danger
                                  aria-label={`Hapus ${option.label}`}
                                  icon={<Trash2 size={16} />}
                                  disabled={!doc}
                                />
                              </Tooltip>
                            </Popconfirm>
                          </Flex>
                        </Flex>
                      );
                    })}
                  </Flex>
                )}
              </Flex>
            </SectionCard>
          ) : null}
        </Flex>
      </Form>
    </Drawer>
  );
};

export default DbForm;
