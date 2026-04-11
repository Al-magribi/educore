import { Alert, DatePicker, Form, InputNumber, Modal, Select } from "antd";

import { rupiahInputProps, transactionTypeOptions } from "../constants";

const ContributionTransactionModal = ({
  open,
  form,
  editingTransaction,
  selectableStudents,
  transactionType,
  onCancel,
  onSubmit,
  confirmLoading,
}) => (
  <Modal
    title={
      editingTransaction ? "Edit Transaksi Kas Kelas" : "Catat Transaksi Kas Kelas"
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
        type={transactionType === "expense" ? "warning" : "success"}
        style={{ marginBottom: 16, borderRadius: 14 }}
        message={
          transactionType === "expense"
            ? "Pengeluaran akan mengurangi saldo kas kelas."
            : "Pemasukan akan menandai siswa sebagai sudah membayar pada periode aktif."
        }
      />

      <Form.Item
        name='transaction_type'
        label='Jenis Transaksi'
        rules={[{ required: true, message: "Jenis transaksi wajib dipilih" }]}
      >
        <Select options={transactionTypeOptions} virtual={false} />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(previous, current) =>
          previous.transaction_type !== current.transaction_type
        }
      >
        {({ getFieldValue }) =>
          getFieldValue("transaction_type") === "income" ? (
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
                  label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""} - ${item.class_name || "-"}`,
                }))}
                placeholder='Pilih siswa'
                virtual={false}
              />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Form.Item
        name='amount'
        label='Nominal'
        rules={[{ required: true, message: "Nominal wajib diisi" }]}
      >
        <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
      </Form.Item>

      <Form.Item
        name='transaction_date'
        label='Tanggal Transaksi'
        rules={[{ required: true, message: "Tanggal transaksi wajib diisi" }]}
      >
        <DatePicker
          showTime
          format='DD MMM YYYY HH:mm'
          style={{ width: "100%" }}
        />
      </Form.Item>
    </Form>
  </Modal>
);

export default ContributionTransactionModal;
