import { memo, useMemo } from "react";
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
  access,
  classOptions,
  editingTransaction,
  students,
  studentOptions,
  selectedStudent,
  onCancel,
  onSubmit,
  confirmLoading,
}) => {
  const watchedClassId = Form.useWatch("class_id", form);
  const watchedStudentId = Form.useWatch("student_id", form);
  const watchedType = Form.useWatch("transaction_type", form);
  const isTeacherScope = access?.role_scope === "teacher";
  const transactionTypeOptions = useMemo(
    () =>
      Object.entries(transactionTypeMeta).map(([value, meta]) => ({
        value,
        label: meta.label,
      })),
    [],
  );
  const filteredStudentOptions = useMemo(() => {
    if (isTeacherScope) {
      return studentOptions;
    }

    if (!watchedClassId) {
      return [];
    }

    return students
      .filter((item) => item.class_id === watchedClassId)
      .map((item) => ({
        value: item.id,
        label: `${item.full_name}${item.nis ? ` (${item.nis})` : ""} - ${
          item.class_name || "-"
        }`,
      }));
  }, [isTeacherScope, studentOptions, students, watchedClassId]);
  const activeStudent =
    students.find((item) => item.id === watchedStudentId) || selectedStudent;

  return (
    <Modal
      title={
        editingTransaction
          ? "Edit Transaksi Tabungan"
          : "Catat Transaksi Tabungan"
      }
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
          title={
            watchedType === "withdrawal"
              ? "Pastikan nominal penarikan tidak melebihi saldo siswa."
              : "Setoran akan langsung menambah saldo tabungan siswa."
          }
        />

        {!isTeacherScope ? (
          <Form.Item
            name='class_id'
            label='Kelas'
            rules={[{ required: true, message: "Kelas wajib dipilih" }]}
          >
            <Select
              options={classOptions}
              placeholder='Pilih kelas'
              onChange={() => {
                form.setFieldValue("student_id", undefined);
              }}
              showSearch={{ optionFilterProp: "label" }}
              virtual={false}
            />
          </Form.Item>
        ) : null}

        <Form.Item
          name='student_id'
          label='Siswa'
          rules={[{ required: true, message: "Siswa wajib dipilih" }]}
        >
          <Select
            showSearch={{ optionFilterProp: "label" }}
            options={filteredStudentOptions}
            placeholder={
              isTeacherScope
                ? "Pilih siswa"
                : watchedClassId
                  ? "Pilih siswa"
                  : "Pilih kelas terlebih dahulu"
            }
            disabled={!isTeacherScope && !watchedClassId}
            virtual={false}
          />
        </Form.Item>

        {activeStudent ? (
          <Space
            vertical
            size={2}
            style={{
              width: "100%",
              marginBottom: 16,
              padding: 14,
              borderRadius: 16,
              background: "#f8fafc",
            }}
          >
            <Text strong>
              {activeStudent.full_name || activeStudent.student_name}
            </Text>
            <Text type='secondary'>
              {activeStudent.nis || "-"} | {activeStudent.class_name || "-"}
            </Text>
            {"balance" in activeStudent ? (
              <Text type='secondary'>
                Saldo saat ini{" "}
                {currencyFormatter.format(Number(activeStudent.balance || 0))}
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
            options={transactionTypeOptions}
            placeholder='Pilih jenis transaksi'
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

export default memo(SavingTransactionModal);
