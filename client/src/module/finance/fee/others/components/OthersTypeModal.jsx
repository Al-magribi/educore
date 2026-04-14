import { Form, Input, InputNumber, Modal, Select } from "antd";

import { rupiahInputProps } from "../constants";

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
    title={editingType ? "Edit Jenis Biaya" : "Tambah Jenis Biaya"}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    width={560}
    destroyOnClose
    centered
  >
    <Form form={form} layout='vertical' onFinish={onSubmit}>
      {homebases.length > 1 ? (
        <Form.Item
          name='homebase_id'
          label='Satuan'
          rules={[{ required: true, message: "Satuan wajib dipilih" }]}
        >
          <Select
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
        <Input placeholder='Contoh: Seragam, Buku Paket, Study Tour' />
      </Form.Item>
      <Form.Item name='description' label='Deskripsi'>
        <Input.TextArea rows={3} placeholder='Opsional' />
      </Form.Item>
      <Form.Item
        name='amount'
        label='Nominal'
        rules={[{ required: true, message: "Nominal wajib diisi" }]}
      >
        <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
      </Form.Item>
      <Form.Item
        name='grade_ids'
        label='Berlaku Untuk Tingkat'
        rules={[{ required: true, message: "Minimal satu tingkat wajib dipilih" }]}
      >
        <Select
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
          options={[
            { value: true, label: "Aktif" },
            { value: false, label: "Nonaktif" },
          ]}
        />
      </Form.Item>
    </Form>
  </Modal>
);

export default OthersTypeModal;
