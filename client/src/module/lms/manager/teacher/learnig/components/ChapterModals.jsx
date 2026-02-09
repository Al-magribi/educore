import React from "react";
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Upload,
  message,
} from "antd";
import { FileText, Upload as UploadIcon } from "lucide-react";
import { useUploadContentFileMutation } from "../../../../../../service/lms/ApiLms";
import { Editor } from "../../../../../../components";
import { YoutubeOutlined } from "@ant-design/icons";

const ChapterModals = ({
  chapterModalOpen,
  editingChapter,
  onCancelChapter,
  onOkChapter,
  chapterForm,
  gradeOptions,
  classOptions,
  contentModalOpen,
  editingContent,
  onCancelContent,
  onOkContent,
  contentForm,
}) => {
  const [uploadContentFile, { isLoading: isUploading }] =
    useUploadContentFileMutation();

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await uploadContentFile(formData).unwrap();
      const url = response?.data?.url;
      const name = response?.data?.name;
      if (!url) {
        message.error("Upload gagal.");
        return false;
      }
      contentForm.setFieldsValue({
        attachment_url: url,
        attachment_name: name || null,
      });
      message.success("File berhasil diupload.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal upload file.");
    }
    return false;
  };

  return (
    <>
      <Modal
        title={editingChapter ? "Edit Bab" : "Tambah Bab"}
        open={chapterModalOpen}
        onCancel={onCancelChapter}
        onOk={onOkChapter}
        okText={editingChapter ? "Simpan" : "Tambah"}
        destroyOnHidden
        centered
        width={820}
      >
        <Form layout="vertical" form={chapterForm}>
          <Form.Item
            name="title"
            label="Judul Bab"
            rules={[{ required: true, message: "Judul wajib diisi." }]}
          >
            <Input placeholder="Contoh: Bab 1 - Pengenalan" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Editor placeholder="Deskripsi singkat bab." height="160px" />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item name="order_number" label="Urutan">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="grade_id"
                label="Tingkat"
                rules={[{ required: true, message: "Tingkat wajib diisi." }]}
              >
                <Select options={gradeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="class_ids"
                label="Kelas"
                rules={[{ required: true, message: "Kelas wajib diisi." }]}
              >
                <Select mode="multiple" options={classOptions} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingContent ? "Edit Subbab" : "Tambah Subbab"}
        open={contentModalOpen}
        onCancel={onCancelContent}
        onOk={onOkContent}
        okText={editingContent ? "Simpan" : "Tambah"}
        destroyOnHidden
        centered
        width={820}
      >
        <Form layout="vertical" form={contentForm}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="title"
                label="Judul Subbab"
                rules={[{ required: true, message: "Judul wajib diisi." }]}
              >
                <Input placeholder="Contoh: Materi Inti" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="video_url" label="Link Youtube">
                <Input
                  prefix={<YoutubeOutlined />}
                  placeholder="https://youtube.com/..."
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="body" label="Deskripsi">
            <Editor placeholder="Ringkasan materi." height="180px" />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={18}>
              <Form.Item
                name="attachment_url"
                label="File Lampiran"
                extra="Format umum: pdf, docx, pptx, xlsx, gambar."
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    prefix={<FileText size={14} />}
                    placeholder="Upload atau tempel link file"
                  />
                  <Upload
                    beforeUpload={handleUpload}
                    showUploadList={false}
                    maxCount={1}
                  >
                    <Button
                      type="primary"
                      icon={<UploadIcon size={14} />}
                      loading={isUploading}
                    >
                      Upload
                    </Button>
                  </Upload>
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="attachment_name" label="Nama File">
                <Input placeholder="Otomatis" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="attachment_name" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ChapterModals;
