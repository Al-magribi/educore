import React from "react";
import {
  Button,
  Col,
  Flex,
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
import { FileText, Plus, Trash2, Upload as UploadIcon } from "lucide-react";
import { useUploadContentFileMutation } from "../../../../../../service/lms/ApiLms";
import Editor from "../../../../../../components/editor/TextEditor";
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

  const handleUpload = async (file, index) => {
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
      const attachments = contentForm.getFieldValue("attachments") || [];
      const nextAttachments = [...attachments];
      nextAttachments[index] = {
        ...(nextAttachments[index] || {}),
        url,
        name: name || null,
      };
      contentForm.setFieldsValue({
        attachments: nextAttachments,
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
        <Form layout='vertical' form={chapterForm}>
          <Form.Item
            name='title'
            label='Judul Bab'
            rules={[{ required: true, message: "Judul wajib diisi." }]}
          >
            <Input placeholder='Contoh: Bab 1 - Pengenalan' />
          </Form.Item>
          <Form.Item name='description' label='Deskripsi'>
            <Editor placeholder='Deskripsi singkat bab.' height='160px' />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item name='order_number' label='Urutan'>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name='grade_id'
                label='Tingkat'
                rules={[{ required: true, message: "Tingkat wajib diisi." }]}
              >
                <Select options={gradeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name='class_ids'
                label='Kelas'
                rules={[{ required: true, message: "Kelas wajib diisi." }]}
              >
                <Select mode='multiple' options={classOptions} />
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
        <Form layout='vertical' form={contentForm}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name='title'
                label='Judul Subbab'
                rules={[{ required: true, message: "Judul wajib diisi." }]}
              >
                <Input placeholder='Contoh: Materi Inti' />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label='Link Youtube'>
                <Form.List name='video_urls'>
                  {(fields, { add, remove }) => (
                    <Flex vertical gap={8}>
                      {fields.map((field) => (
                        <Space.Compact key={field.key} style={{ width: "100%" }}>
                          <Form.Item
                            {...field}
                            style={{ flex: 1, marginBottom: 0 }}
                            rules={[
                              {
                                validator: (_, value) => {
                                  if (!value || !String(value).trim()) {
                                    return Promise.resolve();
                                  }
                                  const valid =
                                    /(youtube\.com|youtu\.be)/i.test(String(value));
                                  if (!valid) {
                                    return Promise.reject(
                                      new Error("Masukkan link YouTube yang valid."),
                                    );
                                  }
                                  return Promise.resolve();
                                },
                              },
                            ]}
                          >
                            <Input
                              prefix={<YoutubeOutlined />}
                              placeholder='https://youtube.com/...'
                            />
                          </Form.Item>
                          <Button
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() => remove(field.name)}
                          />
                        </Space.Compact>
                      ))}
                      <Button
                        type='dashed'
                        icon={<Plus size={14} />}
                        onClick={() => add("")}
                      >
                        Tambah Link
                      </Button>
                    </Flex>
                  )}
                </Form.List>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='body' label='Deskripsi'>
            <Editor placeholder='Ringkasan materi.' height='180px' />
          </Form.Item>

          <Form.Item
            label='File Lampiran'
            extra='Format umum: pdf, docx, pptx, xlsx, gambar.'
          >
            <Form.List name='attachments'>
              {(fields, { add, remove }) => (
                <Flex vertical gap={8}>
                  {fields.map((field) => (
                    <Row key={field.key} gutter={[8, 8]}>
                      <Col xs={24} md={14}>
                        <Form.Item
                          name={[field.name, "url"]}
                          rules={[
                            {
                              validator: (_, value) => {
                                if (!value || !String(value).trim()) {
                                  return Promise.resolve();
                                }
                                const normalized = String(value).trim();
                                const valid =
                                  /^https?:\/\//i.test(normalized) ||
                                  normalized.startsWith("/assets/");
                                if (!valid) {
                                  return Promise.reject(
                                    new Error("Masukkan URL valid atau path /assets/..."),
                                  );
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            prefix={<FileText size={14} />}
                            placeholder='Upload atau tempel link file'
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item
                          name={[field.name, "name"]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder='Nama file' />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Space.Compact style={{ width: "100%" }}>
                          <Upload
                            beforeUpload={(file) =>
                              handleUpload(file, field.name)
                            }
                            showUploadList={false}
                            maxCount={1}
                          >
                            <Button
                              type='primary'
                              icon={<UploadIcon size={14} />}
                              loading={isUploading}
                            >
                              Upload
                            </Button>
                          </Upload>
                          <Button
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() => remove(field.name)}
                          />
                        </Space.Compact>
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type='dashed'
                    icon={<Plus size={14} />}
                    onClick={() => add({ url: "", name: "" })}
                  >
                    Tambah File
                  </Button>
                </Flex>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ChapterModals;
