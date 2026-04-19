import { Form, Input, InputNumber, Modal, Select, Switch, Tag } from "antd";

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

const renderPeriodeOption = (option) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    <span>{option.data.label}</span>
    <Tag color={option.data.is_active ? "green" : "default"}>
      {option.data.is_active ? "Aktif" : "Nonaktif"}
    </Tag>
  </div>
);

const MonthlyTariffModal = ({
  open,
  editingTariff,
  onCancel,
  onSubmit,
  onHomebaseChange,
  form,
  homebases,
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
        name='homebase_id'
        label='Satuan'
        rules={[{ required: true, message: "Satuan wajib dipilih" }]}
      >
        <Select
          options={homebases.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={onHomebaseChange}
          placeholder='Pilih satuan'
          virtual={false}
          disabled={homebases.length <= 1}
        />
      </Form.Item>
      <Form.Item
        name='periode_id'
        label='Periode'
        rules={[{ required: true, message: "Periode wajib dipilih" }]}
      >
        <Select
          options={periodes.map((item) => ({
            value: item.id,
            label: item.name,
            is_active: item.is_active,
          }))}
          placeholder='Pilih periode'
          virtual={false}
          optionRender={renderPeriodeOption}
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
