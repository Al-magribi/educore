import { Alert, Form, Input, InputNumber, Modal, Select } from "antd";

import { rupiahInputProps } from "../constants";

const StudentContributionTransactionModal = ({
  open,
  form,
  editingTransaction,
  mode,
  selectableStudents,
  onCancel,
  onSubmit,
  confirmLoading,
}) => (
  <Modal
    title={
      editingTransaction
        ? mode === "expense"
          ? "Edit Pengeluaran Kas Kelas"
          : "Edit Pembayaran Kas Kelas"
        : mode === "expense"
          ? "Catat Pengeluaran Kas Kelas"
          : "Catat Pembayaran Kas Kelas"
    }
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    width='min(720px, calc(100vw - 24px))'
    destroyOnHidden
    centered
  >
    <Form form={form} layout='vertical' onFinish={onSubmit}>
      <Alert
        showIcon
        type={mode === "expense" ? "warning" : "success"}
        style={{ marginBottom: 16, borderRadius: 14 }}
        message={
          mode === "expense"
            ? "Pengeluaran akan mengurangi saldo kas kelas."
            : "Pemasukan akan menandai siswa sebagai sudah membayar pada periode aktif."
        }
      />

      {mode === "income" ? (
        <Form.Item
          name='student_id'
          label='Siswa Pembayar'
          rules={[{ required: true, message: "Siswa wajib dipilih" }]}
        >
          <Select
            showSearch
            optionFilterProp='label'
            options={selectableStudents.map((item) => ({
              value: item.student_id,
              label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""}`,
            }))}
            placeholder='Pilih siswa'
            virtual={false}
          />
        </Form.Item>
      ) : (
        <Form.Item
          name='description'
          label='Keperluan Pengeluaran'
          rules={[{ required: true, message: "Keperluan pengeluaran wajib diisi" }]}
        >
          <Input placeholder='Contoh: Beli sapu kelas' />
        </Form.Item>
      )}

      <Form.Item
        name='amount'
        label='Nominal'
        rules={[{ required: true, message: "Nominal wajib diisi" }]}
      >
        <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
      </Form.Item>
    </Form>
  </Modal>
);

export default StudentContributionTransactionModal;
