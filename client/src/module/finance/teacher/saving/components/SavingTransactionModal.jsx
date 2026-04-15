import { memo, useMemo } from "react";
import {
  Alert,
  Avatar,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { Search } from "lucide-react";

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
  homebaseName,
  editingTransaction,
  students,
  selectedStudent,
  isStudentOptionsLoading,
  currentStudentSearch,
  onStudentSelect,
  onStudentSearchChange,
  onCancel,
  onSubmit,
  confirmLoading,
}) => {
  const watchedStudentId = Form.useWatch("student_id", form);
  const watchedType = Form.useWatch("transaction_type", form);
  const watchedStudentSearch = Form.useWatch("student_search", form) || "";
  const transactionTypeOptions = useMemo(
    () =>
      Object.entries(transactionTypeMeta).map(([value, meta]) => ({
        value,
        label: meta.label,
      })),
    [],
  );
  const studentSearchValue = currentStudentSearch ?? watchedStudentSearch;
  const normalizedStudents = useMemo(
    () =>
      students.map((item) => ({
        ...item,
        optionValue: item.id || item.student_id,
        displayName: item.full_name || item.student_name,
      })),
    [students],
  );
  const studentOptions = useMemo(
    () =>
      normalizedStudents.map((item) => ({
        value: item.optionValue,
        plainLabel: `${item.displayName}${item.nis ? ` - ${item.nis}` : ""}`,
        studentData: item,
        label: (
          <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
            <Space vertical size={1}>
              <Text strong style={{ color: "#0f172a" }}>
                {item.displayName}
              </Text>
              <Text type='secondary'>
                {`NIS ${item.nis || "-"} | ${item.homebase_name || homebaseName || "-"} | ${item.periode_name || access?.active_periode_name || "-"}`}
              </Text>
            </Space>
            <Tag color='blue' style={{ borderRadius: 999 }}>
              {`${item.grade_name || "-"} | ${item.class_name || "-"}`}
            </Tag>
          </Flex>
        ),
      })),
    [access?.active_periode_name, homebaseName, normalizedStudents],
  );
  const activeStudent = useMemo(() => {
    const selectedId = Number(watchedStudentId);

    return (
      normalizedStudents.find(
        (item) => Number(item.optionValue) === selectedId,
      ) ||
      (selectedStudent
        ? {
            ...selectedStudent,
            optionValue: selectedStudent.id || selectedStudent.student_id,
            displayName:
              selectedStudent.full_name || selectedStudent.student_name,
          }
        : null)
    );
  }, [normalizedStudents, selectedStudent, watchedStudentId]);

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
        <Form.Item
          name='student_id'
          hidden
          rules={[{ required: true, message: "Siswa wajib dipilih" }]}
        >
          <Select />
        </Form.Item>
        <Form.Item name='class_id' hidden>
          <Select />
        </Form.Item>
        <Form.Item name='grade_id' hidden>
          <Select />
        </Form.Item>
        <Form.Item name='student_search' hidden>
          <Input />
        </Form.Item>

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

        <Form.Item
          label='Cari Siswa'
          extra='Ketik nama siswa atau NIS. Data siswa akan dimuat saat pencarian dan konteks satuan, periode, tingkat, serta kelas akan tampil setelah siswa dipilih.'
        >
          <Select
            size='large'
            allowClear
            showSearch={{
              optionFilterProp: "label",
              onSearch: onStudentSearchChange,
            }}
            value={watchedStudentId}
            placeholder='Contoh: Budi / 23001'
            filterOption={false}
            searchValue={studentSearchValue}
            optionLabelProp='plainLabel'
            suffixIcon={<Search size={16} color='#94a3b8' />}
            notFoundContent={
              !studentSearchValue.trim()
                ? "Mulai ketik nama siswa atau NIS"
                : isStudentOptionsLoading
                  ? "Mencari siswa..."
                  : "Siswa tidak ditemukan"
            }
            options={studentOptions}
            loading={isStudentOptionsLoading}
            defaultActiveFirstOption={false}
            onBlur={() => {
              if (!activeStudent) {
                form.setFieldValue("student_search", studentSearchValue);
              }
            }}
            onChange={(value, option) => {
              const selected = Array.isArray(option)
                ? option[0]?.studentData
                : option?.studentData;

              if (!value || !selected) {
                onStudentSelect(null);
                onStudentSearchChange("");
                form.setFieldsValue({
                  student_search: "",
                  student_id: undefined,
                  grade_id: undefined,
                  class_id: undefined,
                });
                return;
              }

              onStudentSelect(selected);
              form.setFieldsValue({
                student_search: `${selected.displayName}${selected.nis ? ` - ${selected.nis}` : ""}`,
                student_id: selected.optionValue,
                grade_id: selected.grade_id,
                class_id: selected.class_id,
              });
            }}
            virtual={false}
          />
        </Form.Item>

        {activeStudent ? (
          <Card
            bordered={false}
            style={{
              marginBottom: 16,
              borderRadius: 20,
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
              <Space size={14} align='start'>
                <Avatar
                  size={52}
                  style={{ background: "#2563eb", fontWeight: 700 }}
                >
                  {(activeStudent.displayName || "?").slice(0, 1).toUpperCase()}
                </Avatar>
                <Space vertical size={2}>
                  <Text strong style={{ color: "#ffffff", fontSize: 16 }}>
                    {activeStudent.displayName}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    NIS {activeStudent.nis || "-"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    {`Satuan ${activeStudent.homebase_name || homebaseName || "-"} | ${activeStudent.periode_name || access?.active_periode_name || "-"}`}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    {`Tingkat ${activeStudent.grade_name || "-"} | Kelas ${activeStudent.class_name || "-"}`}
                  </Text>
                  {"balance" in activeStudent ? (
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      {`Saldo saat ini ${currencyFormatter.format(Number(activeStudent.balance || 0))}`}
                    </Text>
                  ) : null}
                </Space>
              </Space>
              <Tag
                color='blue'
                style={{ borderRadius: 999, paddingInline: 12 }}
              >
                Siswa Terpilih
              </Tag>
            </Flex>
          </Card>
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
      </Form>
    </Modal>
  );
};

export default memo(SavingTransactionModal);
