import dayjs from "dayjs";
import {
  Alert,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";

import {
  currencyFormatter,
  rupiahInputProps,
  transactionTypeMeta,
} from "../constants";

const { Text } = Typography;

const SavingTransactionModal = ({
  open,
  form,
  editingTransaction,
  students,
  selectedStudent,
  onCancel,
  onSubmit,
  confirmLoading,
}) => {
  const watchedStudentId = Form.useWatch("student_id", form);
  const watchedType = Form.useWatch("transaction_type", form);
  const activeStudent =
    students.find((item) => item.id === watchedStudentId) || selectedStudent;

  return (
    <Modal
      title={editingTransaction ? "Edit Transaksi Tabungan" : "Catat Transaksi Tabungan"}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={confirmLoading}
      width='min(680px, calc(100vw - 24px))'
      destroyOnHidden
      centered
    >
      <Form form={form} layout='vertical' onFinish={onSubmit}>
        <Alert
          showIcon
          type={watchedType === "withdrawal" ? "warning" : "success"}
          style={{ marginBottom: 16, borderRadius: 14 }}
          message={
            watchedType === "withdrawal"
              ? "Pastikan nominal penarikan tidak melebihi saldo siswa."
              : "Setoran akan langsung menambah saldo tabungan siswa."
          }
        />

        <Form.Item
          name='student_id'
          label='Siswa'
          rules={[{ required: true, message: "Siswa wajib dipilih" }]}
        >
          <Select
            showSearch
            optionFilterProp='label'
            options={students.map((item) => ({
              value: item.id,
              label: `${item.full_name}${item.nis ? ` (${item.nis})` : ""} - ${item.class_name || "-"}`,
            }))}
            placeholder='Pilih siswa'
            virtual={false}
          />
        </Form.Item>

        {activeStudent ? (
          <Space
            direction='vertical'
            size={2}
            style={{
              width: "100%",
              marginBottom: 16,
              padding: 14,
              borderRadius: 16,
              background: "#f8fafc",
            }}
          >
            <Text strong>{activeStudent.full_name || activeStudent.student_name}</Text>
            <Text type='secondary'>
              {activeStudent.nis || "-"} | {activeStudent.class_name || "-"}
            </Text>
            {"balance" in activeStudent ? (
              <Text type='secondary'>
                Saldo saat ini {currencyFormatter.format(Number(activeStudent.balance || 0))}
              </Text>
            ) : null}
          </Space>
        ) : null}

        <Form.Item
          name='transaction_type'
          label='Jenis Transaksi'
          rules={[{ required: true, message: "Jenis transaksi wajib dipilih" }]}
        >
          <Select
            options={Object.entries(transactionTypeMeta).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
            placeholder='Pilih jenis transaksi'
            virtual={false}
          />
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
          <DatePicker style={{ width: "100%" }} format='DD MMM YYYY' />
        </Form.Item>

        <Form.Item name='description' label='Keterangan'>
          <Input.TextArea
            rows={3}
            placeholder='Contoh: Setoran harian, penarikan untuk kebutuhan buku, dsb.'
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const mapSavingFormValues = (record) => ({
  student_id: record?.student_id,
  transaction_type: record?.transaction_type || "deposit",
  amount: Number(record?.amount || 0) || undefined,
  transaction_date: record?.transaction_date
    ? dayjs(record.transaction_date)
    : dayjs(),
  description: record?.description || undefined,
});

export default SavingTransactionModal;
