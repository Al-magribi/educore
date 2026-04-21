import { Form, Input, InputNumber, Modal, Select, Typography } from "antd";
import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

import { rupiahInputProps } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const OthersTypeModal = ({
  open,
  editingType,
  onCancel,
  onSubmit,
  form,
  confirmLoading,
  homebases,
  grades,
}) => (
  <Modal
    title={null}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    width={620}
    destroyOnClose
    centered
    closable={false}
    styles={{
      content: {
        padding: 0,
        overflow: "hidden",
        borderRadius: 28,
        boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
      },
      body: { padding: 0 },
      footer: { padding: "0 24px 22px" },
    }}
    modalRender={(modalNode) => (
      <MotionDiv
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        {modalNode}
      </MotionDiv>
    )}
  >
    <div
      style={{
        padding: 24,
        background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
      }}
    >
      <div
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: 22,
          background: "linear-gradient(135deg, #eef2ff, #eff6ff)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            display: "grid",
            placeItems: "center",
            borderRadius: 18,
            background: "linear-gradient(135deg, #0f766e, #2563eb)",
            color: "#fff",
            boxShadow: "0 18px 32px rgba(15, 118, 110, 0.22)",
            marginBottom: 14,
          }}
        >
          <ReceiptText size={22} />
        </div>
        <Text strong style={{ display: "block", fontSize: 24, color: "#0f172a" }}>
          {editingType ? "Perbarui Jenis Biaya" : "Tambah Jenis Biaya Baru"}
        </Text>
        <Text type='secondary'>
          Atur master jenis biaya non-SPP yang akan dipakai dalam proses
          penagihan dan pelaporan.
        </Text>
      </div>

      <Form form={form} layout='vertical' onFinish={onSubmit}>
        {homebases.length > 1 ? (
          <Form.Item
            name='homebase_id'
            label='Satuan'
            rules={[{ required: true, message: "Satuan wajib dipilih" }]}
          >
            <Select
              size='large'
              placeholder='Pilih satuan'
              options={homebases.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              virtual={false}
            />
          </Form.Item>
        ) : null}
        <Form.Item
          name='name'
          label='Nama Jenis Biaya'
          rules={[{ required: true, message: "Nama jenis biaya wajib diisi" }]}
        >
          <Input
            size='large'
            placeholder='Contoh: Seragam, Buku Paket, Study Tour'
          />
        </Form.Item>
        <Form.Item name='description' label='Deskripsi'>
          <Input.TextArea rows={3} placeholder='Opsional' />
        </Form.Item>
        <Form.Item
          name='amount'
          label='Nominal'
          rules={[{ required: true, message: "Nominal wajib diisi" }]}
        >
          <InputNumber {...rupiahInputProps} size='large' placeholder='Rp 0' />
        </Form.Item>
        <Form.Item
          name='grade_ids'
          label='Berlaku Untuk Tingkat'
          rules={[{ required: true, message: "Minimal satu tingkat wajib dipilih" }]}
        >
          <Select
            size='large'
            mode='multiple'
            placeholder='Pilih tingkat'
            options={grades.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            virtual={false}
          />
        </Form.Item>
        <Form.Item
          name='is_active'
          label='Status'
          rules={[{ required: true, message: "Status wajib dipilih" }]}
        >
          <Select
            size='large'
            options={[
              { value: true, label: "Aktif" },
              { value: false, label: "Nonaktif" },
            ]}
          />
        </Form.Item>
      </Form>
    </div>
  </Modal>
);

export default OthersTypeModal;
