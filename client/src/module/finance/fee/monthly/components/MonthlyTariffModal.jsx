import { Form, Input, InputNumber, Modal, Select, Switch } from "antd";

const rupiahInputProps = {
  min: 0,
  precision: 0,
  style: { width: "100%" },
  formatter: (value) =>
    value === undefined || value === null || value === ""
      ? ""
      : `Rp ${new Intl.NumberFormat("id-ID").format(Number(value))}`,
  parser: (value) => value?.replace(/[^\d]/g, "") || "",
};

const MonthlyTariffModal = ({
  open,
  editingTariff,
  onCancel,
  onSubmit,
  form,
  periodes,
  grades,
  confirmLoading,
}) => (
  <Modal
    title={editingTariff ? "Edit Tarif SPP" : "Tambah Tarif SPP"}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    destroyOnHidden
    centered
  >
    <Form form={form} layout='vertical' onFinish={onSubmit}>
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
        />
      </Form.Item>
      <Form.Item
        name='grade_id'
        label='Tingkat'
        rules={[{ required: true, message: "Tingkat wajib dipilih" }]}
      >
        <Select
          options={grades.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
      </Form.Item>
      <Form.Item
        name='amount'
        label='Nominal Tarif'
        rules={[{ required: true, message: "Nominal tarif wajib diisi" }]}
      >
        <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
      </Form.Item>
      <Form.Item name='description' label='Keterangan'>
        <Input.TextArea rows={3} placeholder='Opsional' />
      </Form.Item>
      <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
        <Switch />
      </Form.Item>
    </Form>
  </Modal>
);

export default MonthlyTariffModal;
