import { Card, DatePicker, Form, Input, InputNumber, Modal, Space, Typography } from "antd";

import { currencyFormatter, rupiahInputProps } from "../constants";

const { Text } = Typography;

const OthersInstallmentModal = ({
  open,
  editingInstallment,
  selectedCharge,
  onCancel,
  onSubmit,
  form,
  confirmLoading,
}) => (
  <Modal
    title={editingInstallment ? "Edit Pembayaran" : "Tambah Pembayaran"}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    width={620}
    destroyOnClose
    centered
  >
    <Form form={form} layout='vertical' onFinish={onSubmit}>
      <Card
        size='small'
        style={{ marginBottom: 16, borderRadius: 16, background: "#f8fafc" }}
      >
        <Space direction='vertical' size={2}>
          <Text strong>{selectedCharge?.student_name || "-"}</Text>
          <Text type='secondary'>
            {selectedCharge?.type_name || "-"} | Tagihan{" "}
            {currencyFormatter.format(Number(selectedCharge?.amount_due || 0))}
          </Text>
          <Text type='secondary'>
            {editingInstallment
              ? `Mengubah cicilan ke ${editingInstallment.installment_number || "-"}`
              : `Pembayaran ini akan dicatat sebagai cicilan ke ${(selectedCharge?.installment_count || 0) + 1}`}
          </Text>
          <Text type='secondary'>
            Sisa tagihan{" "}
            {currencyFormatter.format(Number(selectedCharge?.remaining_amount || 0))}
          </Text>
        </Space>
      </Card>
      <Form.Item name='charge_id' hidden>
        <Input />
      </Form.Item>
      <Form.Item
        name='amount_paid'
        label='Nominal Dibayar'
        rules={[{ required: true, message: "Nominal pembayaran wajib diisi" }]}
      >
        <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
      </Form.Item>
      <Form.Item
        name='payment_date'
        label='Tanggal Pembayaran'
        rules={[{ required: true, message: "Tanggal pembayaran wajib diisi" }]}
      >
        <DatePicker style={{ width: "100%" }} format='DD MMM YYYY' />
      </Form.Item>
      <Form.Item name='payment_method' label='Metode Pembayaran'>
        <Input placeholder='Cash / Transfer / QRIS' />
      </Form.Item>
      <Form.Item name='notes' label='Catatan'>
        <Input.TextArea rows={3} placeholder='Opsional' />
      </Form.Item>
    </Form>
  </Modal>
);

export default OthersInstallmentModal;
