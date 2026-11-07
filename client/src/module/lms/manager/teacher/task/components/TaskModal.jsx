import React from "react";
import { Col, DatePicker, Form, Grid, Input, Modal, Row, Select } from "antd";
import dayjs from "dayjs";
import Editor from "../../../../../../components/editor/TextEditor";

const { useBreakpoint } = Grid;

const TaskModal = ({
  open,
  editingTask,
  onCancel,
  onSubmit,
  form,
  chapterOptions,
  classOptions,
  confirmLoading,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Modal
      title={editingTask ? "Edit Penugasan" : "Tambah Penugasan"}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      okText={editingTask ? "Simpan Perubahan" : "Simpan Penugasan"}
      destroyOnHidden
      centered
      width={isMobile ? "calc(100vw - 24px)" : 920}
      styles={{
        body: {
          maxHeight: isMobile ? "70vh" : undefined,
          overflowY: isMobile ? "auto" : undefined,
        },
      }}
    >
      <Form layout='vertical' form={form}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Form.Item
              name='chapter_id'
              label='Chapter'
              rules={[{ required: true, message: "Chapter wajib dipilih." }]}
            >
              <Select
                showSearch={{ optionFilterProp: "label" }}
                placeholder='Pilih chapter'
                options={chapterOptions}
                virtual={false}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='deadline_at'
              label='Deadline Penugasan'
              rules={[{ required: true, message: "Deadline wajib diisi." }]}
              normalize={(value) => (dayjs.isDayjs(value) ? value : value)}
            >
              <DatePicker
                style={{ width: "100%" }}
                showTime={{ format: "HH:mm" }}
                format='DD MMM YYYY HH:mm'
                placeholder='Pilih tanggal dan jam'
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name='title'
          label='Nama Tugas'
          rules={[{ required: true, message: "Nama tugas wajib diisi." }]}
        >
          <Input placeholder='Contoh: Tugas Refleksi Bab 1' maxLength={200} />
        </Form.Item>

        <Form.Item
          name='class_ids'
          label='Kelas Target'
          rules={[
            { required: true, message: "Minimal satu kelas wajib dipilih." },
          ]}
        >
          <Select
            mode='multiple'
            showSearch={{ optionFilterProp: "label" }}
            placeholder='Pilih satu atau beberapa kelas'
            options={classOptions}
            virtual={false}
          />
        </Form.Item>

        <Form.Item
          name='instruction'
          label='Instruksi Penugasan'
          rules={[
            {
              validator: (_, value) => {
                const plain = String(value || "")
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                if (!plain) {
                  return Promise.reject(
                    new Error("Instruksi penugasan wajib diisi."),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Editor
            placeholder='Tuliskan instruksi, ketentuan, dan hasil yang diharapkan.'
            height={isMobile ? "180px" : "220px"}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskModal;
