import { Alert, Form, Input, Modal, Select, Space, Typography } from "antd";

import { currencyFormatter } from "../constants";

const { Text } = Typography;

const MonthlyPaymentModal = ({
  open,
  editingPayment,
  onCancel,
  onSubmit,
  onStudentChange,
  form,
  periodes,
  students,
  months,
  tariffAmount,
  availableMonths,
  activeHomebaseName,
  confirmLoading,
}) => (
  <Modal
    title={editingPayment ? "Edit Pembayaran SPP" : "Input Pembayaran SPP"}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    destroyOnHidden
    centered
    width={640}
  >
    <Form form={form} layout='vertical' onFinish={onSubmit}>
      <Form.Item name='homebase_id' hidden>
        <Input />
      </Form.Item>

      <Form.Item name='grade_id' hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name='periode_id'
        label='Periode'
        rules={[{ required: true, message: "Periode wajib dipilih" }]}
      >
        <Select
          options={periodes.map((item) => ({
            value: item.id,
            label: item.is_active ? `${item.name} (Aktif)` : item.name,
          }))}
          virtual={false}
          disabled
        />
      </Form.Item>

      <Form.Item
        name='student_id'
        label='Siswa'
        rules={[{ required: true, message: "Siswa wajib dipilih" }]}
      >
        <Select
          showSearch
          optionFilterProp='label'
          placeholder='Pilih siswa'
          options={students.map((item) => ({
            value: item.id,
            label: `${item.grade_name || "-"} | ${item.class_name || "-"} | ${item.full_name}${item.nis ? ` (${item.nis})` : ""}`,
          }))}
          onChange={onStudentChange}
          virtual={false}
          disabled={students.length <= 1}
        />
      </Form.Item>

      {activeHomebaseName ? (
        <Text type='secondary' style={{ display: "block", marginBottom: 12 }}>
          Satuan aktif: {activeHomebaseName}
        </Text>
      ) : null}

      <Alert
        type={tariffAmount > 0 ? "info" : "warning"}
        showIcon
        style={{ marginBottom: 16 }}
        message={
          tariffAmount > 0
            ? `Tarif aktif ${currencyFormatter.format(tariffAmount)} per bulan`
            : "Tarif SPP aktif untuk siswa ini belum tersedia"
        }
      />

      <Form.Item
        name='bill_months'
        label='Bulan yang Dibayar'
        rules={[{ required: true, message: "Pilih minimal satu bulan" }]}
      >
        <Select
          mode='multiple'
          placeholder='Pilih bulan'
          options={months
            .filter((month) => availableMonths.includes(month.value))
            .map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          disabled={tariffAmount <= 0}
          virtual={false}
        />
      </Form.Item>

      <Space direction='vertical' size={2} style={{ marginBottom: 16 }}>
        <Text type='secondary'>
          Bulan yang masih tersedia:{" "}
          {months
            .filter((month) => availableMonths.includes(month.value))
            .map((month) => month.label)
            .join(", ") || "-"}
        </Text>
      </Space>

      <Form.Item name='payment_method' label='Metode Pembayaran'>
        <Select
          placeholder='Pilih metode pembayaran'
          options={[
            { value: "Cash", label: "Cash" },
            { value: "Transfer", label: "Transfer" },
          ]}
          virtual={false}
        />
      </Form.Item>

      <Form.Item name='notes' label='Catatan'>
        <Input.TextArea rows={3} placeholder='Opsional' />
      </Form.Item>
    </Form>
  </Modal>
);

export default MonthlyPaymentModal;
